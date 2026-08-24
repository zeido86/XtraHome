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
      memberships: {
        include: {
          room: {
            include: {
              devices: { orderBy: { sortOrder: "asc" } },
              members: {
                include: { user: { select: { id: true, name: true } } },
              },
            },
          },
        },
      },
      alarmSchedules: {
        orderBy: [{ isActive: "desc" }, { timeOfDay: "asc" }],
        include: { routineSteps: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Användaren hittades inte" }, { status: 404 });
  }

  const rooms = user.memberships.map((membership) => ({
    id: membership.room.id,
    name: membership.room.name,
    homeAssistantAreaId: membership.room.homeAssistantAreaId,
    defaultSceneEntityId: membership.room.defaultSceneEntityId,
    defaultPlaylist: membership.room.defaultPlaylist,
    devices: membership.room.devices,
    members: membership.room.members.map((member) => member.user),
  }));

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      telegramChatId: user.telegramChatId,
    },
    rooms,
    devices: rooms.flatMap((room) =>
      room.devices.map((device) => ({
        ...device,
        roomId: room.id,
        roomName: room.name,
      })),
    ),
    alarms: user.alarmSchedules,
    integration: { n8nConfigured: isN8nConfigured() },
  });
}
