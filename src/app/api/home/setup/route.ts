import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { adminRoomSetupSchema } from "@/lib/alarm-schema";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = adminRoomSetupSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga rumsuppgifter" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Användaren hittades inte" }, { status: 404 });
  }

  const room = await prisma.room.upsert({
    where: { userId: target.id },
    create: {
      userId: target.id,
      name: parsed.data.room.name,
      homeAssistantAreaId: clean(parsed.data.room.homeAssistantAreaId),
      defaultSceneEntityId: clean(parsed.data.room.defaultSceneEntityId),
      defaultPlaylist: clean(parsed.data.room.defaultPlaylist),
    },
    update: {
      name: parsed.data.room.name,
      homeAssistantAreaId: clean(parsed.data.room.homeAssistantAreaId),
      defaultSceneEntityId: clean(parsed.data.room.defaultSceneEntityId),
      defaultPlaylist: clean(parsed.data.room.defaultPlaylist),
    },
  });

  const keptIds: string[] = [];
  for (const [index, device] of parsed.data.devices.entries()) {
    if (device.id) {
      const updated = await prisma.device.updateMany({
        where: { id: device.id, userId: target.id },
        data: {
          kind: device.kind,
          label: device.label,
          alias: device.alias,
          entityId: clean(device.entityId),
          isEnabled: device.isEnabled,
          sortOrder: index,
        },
      });
      if (updated.count === 1) keptIds.push(device.id);
      continue;
    }

    const created = await prisma.device.create({
      data: {
        userId: target.id,
        kind: device.kind,
        label: device.label,
        alias: uniqueAlias(device.alias, keptIds.length),
        entityId: clean(device.entityId),
        isEnabled: device.isEnabled,
        sortOrder: index,
      },
    });
    keptIds.push(created.id);
  }

  await prisma.device.deleteMany({
    where: {
      userId: target.id,
      id: { notIn: keptIds },
    },
  });

  const devices = await prisma.device.findMany({
    where: { userId: target.id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ room, devices });
}

function clean(value?: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed || null;
}

function uniqueAlias(alias: string, index: number) {
  const trimmed = alias.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return trimmed.length >= 2 ? trimmed : `enhet-${index + 1}`;
}
