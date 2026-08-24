export const WEEKDAY_OPTIONS = [
  { value: "MONDAY", label: "Mån" },
  { value: "TUESDAY", label: "Tis" },
  { value: "WEDNESDAY", label: "Ons" },
  { value: "THURSDAY", label: "Tor" },
  { value: "FRIDAY", label: "Fre" },
  { value: "SATURDAY", label: "Lör" },
  { value: "SUNDAY", label: "Sön" },
] as const;

export const ALARM_STEP_TYPE_OPTIONS = [
  { value: "TURN_ON_DEVICE", label: "Starta enhet" },
  { value: "PLAY_MUSIC", label: "Spela musik" },
  { value: "SET_VOLUME", label: "Sätt volym" },
  { value: "SEND_TELEGRAM", label: "Skicka Telegram" },
  { value: "TRIGGER_SCENE", label: "Trigga scen" },
  { value: "WAIT", label: "Vänta" },
] as const;

export const USER_ALARM_STEP_TYPE_OPTIONS = [
  { value: "TURN_ON_DEVICE", label: "Starta enhet" },
  { value: "PLAY_MUSIC", label: "Spela musik" },
  { value: "SET_VOLUME", label: "Sätt volym" },
  { value: "TRIGGER_SCENE", label: "Kör scen" },
  { value: "WAIT", label: "Vänta" },
] as const;

export const DEVICE_KIND_OPTIONS = [
  { value: "TV", label: "TV" },
  { value: "SPEAKER", label: "Högtalare" },
  { value: "LIGHT", label: "Ljus" },
  { value: "SCENE", label: "Scen" },
  { value: "SWITCH", label: "Brytare" },
] as const;

export type WeekdayValue = (typeof WEEKDAY_OPTIONS)[number]["value"];
export type AlarmStepTypeValue = (typeof ALARM_STEP_TYPE_OPTIONS)[number]["value"];

export function weekdayLabel(value: string) {
  return WEEKDAY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function alarmStepTypeLabel(value: string) {
  return (
    ALARM_STEP_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}
