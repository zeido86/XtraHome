import { z } from "zod";

const weekdaySchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

const stepTypeSchema = z.enum([
  "TURN_ON_DEVICE",
  "PLAY_MUSIC",
  "SET_VOLUME",
  "SEND_TELEGRAM",
  "TRIGGER_SCENE",
  "WAIT",
]);

export const alarmStepSchema = z.object({
  type: stepTypeSchema,
  label: z.string().trim().max(80).nullable().optional(),
  target: z.string().trim().max(200).nullable().optional(),
  value: z.string().trim().max(500).nullable().optional(),
});

export const alarmScheduleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  timezone: z.string().trim().min(3).max(80).default("Europe/Stockholm"),
  daysOfWeek: z.array(weekdaySchema).min(1).max(7),
  isActive: z.boolean().optional().default(true),
  routineSteps: z.array(alarmStepSchema).min(1).max(12),
});

export const roomFieldsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  homeAssistantAreaId: z.string().trim().max(120).nullable().optional(),
  defaultSceneEntityId: z.string().trim().max(120).nullable().optional(),
  defaultPlaylist: z.string().trim().max(200).nullable().optional(),
});

export const deviceSchema = z.object({
  id: z.string().cuid().optional(),
  kind: z.enum(["TV", "SPEAKER", "LIGHT", "SCENE", "SWITCH"]),
  label: z.string().trim().min(1).max(80),
  alias: z.string().trim().max(40).optional(),
  entityId: z.string().trim().max(120).nullable().optional(),
  isEnabled: z.boolean().optional().default(true),
});

export const roomUpsertSchema = z.object({
  id: z.string().cuid().optional(),
  room: roomFieldsSchema,
  memberUserIds: z.array(z.string().cuid()).max(20),
  devices: z.array(deviceSchema).max(50),
});
