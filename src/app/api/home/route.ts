import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isN8nConfigured } from "@/lib/n8n";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      room: true,
      devices: { orderBy: { sortOrder: "asc" } },
      alarmSchedules: {
        orderBy: [{ isActive: "desc" }, { timeOfDay: "asc" }],
        include: { routineSteps: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Användaren hittades inte" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      telegramChatId: user.telegramChatId,
    },
    room: user.room,
    devices: user.devices,
    alarms: user.alarmSchedules,
    integration: { n8nConfigured: isN8nConfigured() },
  });
}
