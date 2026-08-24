import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { alarmScheduleSchema } from "@/lib/alarm-schema";
import { normalizeAlarmRoutineSteps } from "@/lib/alarm-scheduler";

async function getOwnedAlarm(id: string, userId: string) {
  return prisma.alarmSchedule.findFirst({
    where: { id, userId },
    select: { id: true },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getOwnedAlarm(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Larmet hittades inte" }, { status: 404 });
  }

  const parsed = alarmScheduleSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltigt veckolarm" }, { status: 400 });
  }

  const alarm = await prisma.$transaction(async (tx) => {
    await tx.alarmRoutineStep.deleteMany({ where: { alarmId: id } });
    return tx.alarmSchedule.update({
      where: { id },
      data: {
        name: parsed.data.name,
        timeOfDay: parsed.data.timeOfDay,
        timezone: parsed.data.timezone,
        daysOfWeek: parsed.data.daysOfWeek,
        isActive: parsed.data.isActive,
        lastTriggeredSlot: null,
        routineSteps: {
          create: normalizeAlarmRoutineSteps(parsed.data.routineSteps),
        },
      },
      include: { routineSteps: { orderBy: { sortOrder: "asc" } } },
    });
  });

  return NextResponse.json({ alarm });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getOwnedAlarm(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Larmet hittades inte" }, { status: 404 });
  }

  await prisma.alarmSchedule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
