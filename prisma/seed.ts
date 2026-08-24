import { PrismaClient, Role, type DeviceKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

type SeedRoom = {
  name: string;
  userEmail: string;
  devices: Array<{ kind: DeviceKind; label: string; alias: string }>;
};

const seedUsers = [
  { name: "Anders", email: "anders@xtrahome.local", role: Role.ADMIN },
  { name: "Sandra", email: "sandra@xtrahome.local", role: Role.ADMIN },
  { name: "Alexander", email: "alexander@xtrahome.local", role: Role.USER },
  { name: "William", email: "william@xtrahome.local", role: Role.USER },
  { name: "Oliver", email: "oliver@xtrahome.local", role: Role.USER },
  { name: "Benjamin", email: "benjamin@xtrahome.local", role: Role.USER },
];

const seedRooms: SeedRoom[] = [
  {
    name: "Vardagsrummet",
    userEmail: "anders@xtrahome.local",
    devices: [
      { kind: "TV", label: "TV", alias: "tv" },
      { kind: "SPEAKER", label: "Högtalare", alias: "speaker" },
      { kind: "LIGHT", label: "Ljus", alias: "light" },
    ],
  },
  {
    name: "Köket",
    userEmail: "sandra@xtrahome.local",
    devices: [
      { kind: "SPEAKER", label: "Högtalare", alias: "speaker" },
      { kind: "LIGHT", label: "Ljus", alias: "light" },
      { kind: "SCENE", label: "Morgonscen", alias: "morning" },
    ],
  },
  {
    name: "Alexanders rum",
    userEmail: "alexander@xtrahome.local",
    devices: [
      { kind: "TV", label: "TV", alias: "tv" },
      { kind: "SPEAKER", label: "Musik", alias: "speaker" },
      { kind: "LIGHT", label: "Lampa", alias: "light" },
    ],
  },
  {
    name: "Williams rum",
    userEmail: "william@xtrahome.local",
    devices: [
      { kind: "TV", label: "TV", alias: "tv" },
      { kind: "SPEAKER", label: "Musik", alias: "speaker" },
      { kind: "LIGHT", label: "Lampa", alias: "light" },
    ],
  },
  {
    name: "Olivers rum",
    userEmail: "oliver@xtrahome.local",
    devices: [
      { kind: "TV", label: "TV", alias: "tv" },
      { kind: "SPEAKER", label: "Musik", alias: "speaker" },
      { kind: "LIGHT", label: "Lampa", alias: "light" },
    ],
  },
  {
    name: "Benjamins rum",
    userEmail: "benjamin@xtrahome.local",
    devices: [
      { kind: "TV", label: "TV", alias: "tv" },
      { kind: "SPEAKER", label: "Musik", alias: "speaker" },
      { kind: "LIGHT", label: "Lampa", alias: "light" },
    ],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash("xtrahome123", 10);

  for (const seed of seedUsers) {
    await prisma.user.upsert({
      where: { email: seed.email },
      update: { name: seed.name, role: seed.role },
      create: {
        name: seed.name,
        email: seed.email,
        role: seed.role,
        passwordHash,
      },
    });
  }

  for (const seed of seedRooms) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: seed.userEmail },
    });

    let room = await prisma.room.findFirst({
      where: {
        name: seed.name,
        members: { some: { userId: user.id } },
      },
    });

    if (!room) {
      room = await prisma.room.create({
        data: {
          name: seed.name,
          members: { create: { userId: user.id } },
        },
      });
    } else {
      await prisma.roomMember.upsert({
        where: {
          roomId_userId: { roomId: room.id, userId: user.id },
        },
        update: {},
        create: { roomId: room.id, userId: user.id },
      });
    }

    for (const [index, device] of seed.devices.entries()) {
      await prisma.device.upsert({
        where: {
          roomId_alias: { roomId: room.id, alias: device.alias },
        },
        update: {
          kind: device.kind,
          label: device.label,
          sortOrder: index,
        },
        create: {
          roomId: room.id,
          kind: device.kind,
          label: device.label,
          alias: device.alias,
          sortOrder: index,
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
