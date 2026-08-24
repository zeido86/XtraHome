import { PrismaClient, Role, type DeviceKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

type SeedUser = {
  name: string;
  email: string;
  role: Role;
  room: string;
  devices: Array<{ kind: DeviceKind; label: string; alias: string }>;
};

const seedUsers: SeedUser[] = [
  {
    name: "Anders",
    email: "anders@xtrahome.local",
    role: Role.ADMIN,
    room: "Vardagsrummet",
    devices: [
      { kind: "TV", label: "TV", alias: "tv" },
      { kind: "SPEAKER", label: "Högtalare", alias: "speaker" },
      { kind: "LIGHT", label: "Ljus", alias: "light" },
    ],
  },
  {
    name: "Sandra",
    email: "sandra@xtrahome.local",
    role: Role.ADMIN,
    room: "Köket",
    devices: [
      { kind: "SPEAKER", label: "Högtalare", alias: "speaker" },
      { kind: "LIGHT", label: "Ljus", alias: "light" },
      { kind: "SCENE", label: "Morgonscen", alias: "morning" },
    ],
  },
  {
    name: "Alexander",
    email: "alexander@xtrahome.local",
    role: Role.USER,
    room: "Alexanders rum",
    devices: [
      { kind: "TV", label: "TV", alias: "tv" },
      { kind: "SPEAKER", label: "Musik", alias: "speaker" },
      { kind: "LIGHT", label: "Lampa", alias: "light" },
    ],
  },
  {
    name: "William",
    email: "william@xtrahome.local",
    role: Role.USER,
    room: "Williams rum",
    devices: [
      { kind: "TV", label: "TV", alias: "tv" },
      { kind: "SPEAKER", label: "Musik", alias: "speaker" },
      { kind: "LIGHT", label: "Lampa", alias: "light" },
    ],
  },
  {
    name: "Oliver",
    email: "oliver@xtrahome.local",
    role: Role.USER,
    room: "Olivers rum",
    devices: [
      { kind: "TV", label: "TV", alias: "tv" },
      { kind: "SPEAKER", label: "Musik", alias: "speaker" },
      { kind: "LIGHT", label: "Lampa", alias: "light" },
    ],
  },
  {
    name: "Benjamin",
    email: "benjamin@xtrahome.local",
    role: Role.USER,
    room: "Benjamins rum",
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
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: { name: seed.name, role: seed.role },
      create: {
        name: seed.name,
        email: seed.email,
        role: seed.role,
        passwordHash,
      },
    });

    await prisma.room.upsert({
      where: { userId: user.id },
      update: { name: seed.room },
      create: { userId: user.id, name: seed.room },
    });

    for (const [index, device] of seed.devices.entries()) {
      await prisma.device.upsert({
        where: {
          userId_alias: { userId: user.id, alias: device.alias },
        },
        update: {
          kind: device.kind,
          label: device.label,
          sortOrder: index,
        },
        create: {
          userId: user.id,
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
