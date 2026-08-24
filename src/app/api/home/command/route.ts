import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendToN8n } from "@/lib/n8n";

const commandSchema = z.object({
  deviceId: z.string().cuid(),
  action: z.enum(["turn_on", "turn_off", "play", "pause", "toggle"]),
  value: z.string().trim().max(200).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = commandSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltigt kommando" }, { status: 400 });
  }

  const device = await prisma.device.findFirst({
    where: { id: parsed.data.deviceId, userId: session.user.id, isEnabled: true },
  });
  if (!device) {
    return NextResponse.json({ error: "Enheten hittades inte" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { room: true, devices: { where: { isEnabled: true } } },
  });
  if (!user) {
    return NextResponse.json({ error: "Användaren hittades inte" }, { status: 404 });
  }

  const result = await sendToN8n("home.command", {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      telegramChatId: user.telegramChatId,
    },
    room: user.room
      ? {
          name: user.room.name,
          homeAssistantAreaId: user.room.homeAssistantAreaId,
          defaultSceneEntityId: user.room.defaultSceneEntityId,
          defaultPlaylist: user.room.defaultPlaylist,
        }
      : null,
    device: {
      id: device.id,
      kind: device.kind,
      alias: device.alias,
      label: device.label,
      entityId: device.entityId,
    },
    action: parsed.data.action,
    value: parsed.data.value ?? null,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Kunde inte skicka kommandot till n8n", details: result.payload },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
