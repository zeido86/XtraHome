import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { roomUpsertSchema } from "@/lib/alarm-schema";

export async function GET() {
  const session = await getSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [rooms, users] = await Promise.all([
    prisma.room.findMany({
      orderBy: { name: "asc" },
      include: {
        devices: { orderBy: { sortOrder: "asc" } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    }),
  ]);

  return NextResponse.json({
    rooms: rooms.map((room) => ({
      id: room.id,
      name: room.name,
      homeAssistantAreaId: room.homeAssistantAreaId,
      defaultSceneEntityId: room.defaultSceneEntityId,
      defaultPlaylist: room.defaultPlaylist,
      devices: room.devices,
      members: room.members.map((member) => member.user),
    })),
    users,
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = roomUpsertSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga rumsuppgifter" }, { status: 400 });
  }

  const memberIds = [...new Set(parsed.data.memberUserIds)];
  if (memberIds.length) {
    const count = await prisma.user.count({ where: { id: { in: memberIds } } });
    if (count !== memberIds.length) {
      return NextResponse.json({ error: "En eller flera användare saknas" }, { status: 400 });
    }
  }

  const room = await prisma.$transaction(async (tx) => {
    const saved = parsed.data.id
      ? await tx.room.update({
          where: { id: parsed.data.id },
          data: {
            name: parsed.data.room.name,
            homeAssistantAreaId: clean(parsed.data.room.homeAssistantAreaId),
            defaultSceneEntityId: clean(parsed.data.room.defaultSceneEntityId),
            defaultPlaylist: clean(parsed.data.room.defaultPlaylist),
          },
        })
      : await tx.room.create({
          data: {
            name: parsed.data.room.name,
            homeAssistantAreaId: clean(parsed.data.room.homeAssistantAreaId),
            defaultSceneEntityId: clean(parsed.data.room.defaultSceneEntityId),
            defaultPlaylist: clean(parsed.data.room.defaultPlaylist),
          },
        });

    await tx.roomMember.deleteMany({ where: { roomId: saved.id } });
    if (memberIds.length) {
      await tx.roomMember.createMany({
        data: memberIds.map((userId) => ({ roomId: saved.id, userId })),
      });
    }

    const keptIds: string[] = [];
    const usedAliases = new Set<string>();

    for (const [index, device] of parsed.data.devices.entries()) {
      if (!device.label.trim()) continue;
      let alias = slug(device.alias || device.label, index);
      while (usedAliases.has(alias)) {
        alias = `${alias}-${index + 1}`;
      }
      usedAliases.add(alias);

      if (device.id) {
        const updated = await tx.device.updateMany({
          where: { id: device.id, roomId: saved.id },
          data: {
            kind: device.kind,
            label: device.label,
            alias,
            entityId: clean(device.entityId),
            isEnabled: device.isEnabled,
            sortOrder: index,
          },
        });
        if (updated.count === 1) keptIds.push(device.id);
        continue;
      }

      const created = await tx.device.create({
        data: {
          roomId: saved.id,
          kind: device.kind,
          label: device.label,
          alias,
          entityId: clean(device.entityId),
          isEnabled: device.isEnabled,
          sortOrder: index,
        },
      });
      keptIds.push(created.id);
    }

    await tx.device.deleteMany({
      where: {
        roomId: saved.id,
        id: { notIn: keptIds },
      },
    });

    return tx.room.findUniqueOrThrow({
      where: { id: saved.id },
      include: {
        devices: { orderBy: { sortOrder: "asc" } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });
  });

  return NextResponse.json({
    room: {
      id: room.id,
      name: room.name,
      homeAssistantAreaId: room.homeAssistantAreaId,
      defaultSceneEntityId: room.defaultSceneEntityId,
      defaultPlaylist: room.defaultPlaylist,
      devices: room.devices,
      members: room.members.map((member) => member.user),
    },
  });
}

function clean(value?: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed || null;
}

function slug(value: string, index: number) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.length >= 2 ? cleaned : `enhet-${index + 1}`;
}
