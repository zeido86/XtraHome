import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { roomSchema, deviceSchema } from "@/lib/alarm-schema";
import { z } from "zod";

const bodySchema = z.object({
  room: roomSchema,
  devices: z.array(deviceSchema).max(12),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltiga rumsuppgifter" }, { status: 400 });
  }

  const room = await prisma.room.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
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
        where: { id: device.id, userId: session.user.id },
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
        userId: session.user.id,
        kind: device.kind,
        label: device.label,
        alias: device.alias,
        entityId: clean(device.entityId),
        isEnabled: device.isEnabled,
        sortOrder: index,
      },
    });
    keptIds.push(created.id);
  }

  await prisma.device.deleteMany({
    where: {
      userId: session.user.id,
      id: { notIn: keptIds },
    },
  });

  const devices = await prisma.device.findMany({
    where: { userId: session.user.id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ room, devices });
}

function clean(value?: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed || null;
}
