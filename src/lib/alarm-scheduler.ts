import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendToN8n } from "@/lib/n8n";
import type { AlarmStepType, Weekday } from "@prisma/client";

type AlarmWithRelations = Awaited<ReturnType<typeof getActiveAlarms>>[number];

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();

export async function triggerDueAlarmSchedules() {
  const alarms = await getActiveAlarms();
  let triggered = 0;
  let failed = 0;

  for (const alarm of alarms) {
    const slot = getAlarmSlot(alarm.timezone, new Date());
    if (!alarm.daysOfWeek.includes(slot.weekday) || alarm.timeOfDay !== slot.time) {
      continue;
    }

    const executionKey = `${alarm.id}:${slot.date}:${slot.time}`;
    const existing = await prisma.alarmExecution.findUnique({
      where: { executionKey },
      select: { id: true, status: true },
    });
    if (existing?.status === "SENT") continue;

    const execution = existing
      ? await prisma.alarmExecution.update({
          where: { id: existing.id },
          data: { status: "PENDING", errorMessage: null, completedAt: null },
        })
      : await prisma.alarmExecution.create({
          data: {
            alarmId: alarm.id,
            userId: alarm.userId,
            executionKey,
            scheduledFor: slot.dateTime,
          },
        });

    const payload = buildAlarmPayload(alarm, slot, execution.id);
    const result = await sendToN8n("alarm.triggered", payload);

    if (result.ok) {
      triggered += 1;
      await prisma.$transaction([
        prisma.alarmExecution.update({
          where: { id: execution.id },
          data: {
            status: "SENT",
            requestBody: payload as Prisma.InputJsonValue,
            responseBody: result.payload as Prisma.InputJsonValue,
            completedAt: new Date(),
          },
        }),
        prisma.alarmSchedule.update({
          where: { id: alarm.id },
          data: { lastTriggeredSlot: `${slot.date} ${slot.time}` },
        }),
      ]);
      continue;
    }

    failed += 1;
    await prisma.alarmExecution.update({
      where: { id: execution.id },
      data: {
        status: "FAILED",
        requestBody: payload as Prisma.InputJsonValue,
        responseBody: result.payload as Prisma.InputJsonValue,
        errorMessage:
          typeof result.payload["error"] === "string"
            ? result.payload["error"]
            : `n8n svarade med status ${result.status}`,
        completedAt: new Date(),
      },
    });
  }

  return { triggered, failed };
}

async function getActiveAlarms() {
  return prisma.alarmSchedule.findMany({
    where: { isActive: true },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          telegramChatId: true,
          room: true,
          devices: {
            where: { isEnabled: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      routineSteps: { orderBy: { sortOrder: "asc" } },
    },
  });
}

function buildAlarmPayload(
  alarm: AlarmWithRelations,
  slot: ReturnType<typeof getAlarmSlot>,
  executionId: string,
) {
  return {
    executionId,
    executionKey: `${alarm.id}:${slot.date}:${slot.time}`,
    alarm: {
      id: alarm.id,
      name: alarm.name,
      timezone: alarm.timezone,
      timeOfDay: alarm.timeOfDay,
      daysOfWeek: alarm.daysOfWeek,
    },
    user: {
      id: alarm.user.id,
      name: alarm.user.name,
      email: alarm.user.email,
      telegramChatId: alarm.user.telegramChatId,
    },
    room: alarm.user.room
      ? {
          name: alarm.user.room.name,
          homeAssistantAreaId: alarm.user.room.homeAssistantAreaId,
          defaultSceneEntityId: alarm.user.room.defaultSceneEntityId,
          defaultPlaylist: alarm.user.room.defaultPlaylist,
        }
      : null,
    devices: alarm.user.devices.map((device) => ({
      id: device.id,
      kind: device.kind,
      alias: device.alias,
      label: device.label,
      entityId: device.entityId,
    })),
    schedule: {
      date: slot.date,
      time: slot.time,
      weekday: slot.weekday,
      iso: slot.dateTime.toISOString(),
    },
    routineSteps: alarm.routineSteps.map((step) => ({
      id: step.id,
      order: step.sortOrder,
      type: step.type,
      label: step.label,
      target: step.target,
      value: step.value,
    })),
  };
}

function getAlarmSlot(timezone: string, now: Date) {
  const weekday = mapIntlWeekdayToEnum(
    new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      timeZone: timezone,
    }).format(now),
  );
  const parts = getDateFormatter(timezone).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return {
    weekday,
    time: getTimeFormatter(timezone).format(now),
    date: `${year}-${month}-${day}`,
    dateTime: new Date(now),
  };
}

function getDateFormatter(timezone: string) {
  if (!dateFormatterCache.has(timezone)) {
    dateFormatterCache.set(
      timezone,
      new Intl.DateTimeFormat("sv-SE", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    );
  }
  return dateFormatterCache.get(timezone)!;
}

function getTimeFormatter(timezone: string) {
  if (!timeFormatterCache.has(timezone)) {
    timeFormatterCache.set(
      timezone,
      new Intl.DateTimeFormat("sv-SE", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    );
  }
  return timeFormatterCache.get(timezone)!;
}

function mapIntlWeekdayToEnum(weekday: string): Weekday {
  const weekdayMap: Record<string, Weekday> = {
    monday: "MONDAY",
    tuesday: "TUESDAY",
    wednesday: "WEDNESDAY",
    thursday: "THURSDAY",
    friday: "FRIDAY",
    saturday: "SATURDAY",
    sunday: "SUNDAY",
  };
  return weekdayMap[weekday.toLowerCase()] ?? "MONDAY";
}

export function normalizeAlarmRoutineSteps(
  steps: Array<{
    type: AlarmStepType;
    label?: string | null;
    target?: string | null;
    value?: string | null;
  }>,
) {
  return steps.map((step, index) => ({
    sortOrder: index,
    type: step.type,
    label: (step.label ?? "").trim() || null,
    target: (step.target ?? "").trim() || null,
    value: (step.value ?? "").trim() || null,
  }));
}
