import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { alarmScheduleSchema } from "@/lib/alarm-schema";
import { normalizeAlarmRoutineSteps } from "@/lib/alarm-scheduler";
import { isN8nConfigured } from "@/lib/n8n";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alarms = await prisma.alarmSchedule.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isActive: "desc" }, { timeOfDay: "asc" }],
    include: { routineSteps: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json({
    alarms,
    integration: { n8nConfigured: isN8nConfigured() },
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = alarmScheduleSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltigt veckolarm" }, { status: 400 });
  }

  const alarm = await prisma.alarmSchedule.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      timeOfDay: parsed.data.timeOfDay,
      timezone: parsed.data.timezone,
      daysOfWeek: parsed.data.daysOfWeek,
      isActive: parsed.data.isActive,
      routineSteps: {
        create: normalizeAlarmRoutineSteps(parsed.data.routineSteps),
      },
    },
    include: { routineSteps: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json({ alarm }, { status: 201 });
}
