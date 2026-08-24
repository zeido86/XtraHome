"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LogoutButton } from "@/components/logout-button";
import {
  ALARM_STEP_TYPE_OPTIONS,
  WEEKDAY_OPTIONS,
  alarmStepTypeLabel,
  weekdayLabel,
  type AlarmStepTypeValue,
  type WeekdayValue,
} from "@/lib/alarm-constants";

type DeviceKind = "TV" | "SPEAKER" | "LIGHT" | "SCENE" | "SWITCH";

type Device = {
  id: string;
  kind: DeviceKind;
  label: string;
  alias: string;
  entityId: string | null;
  isEnabled: boolean;
};

type Room = {
  name: string;
  homeAssistantAreaId: string | null;
  defaultSceneEntityId: string | null;
  defaultPlaylist: string | null;
};

type AlarmStep = {
  id?: string;
  type: AlarmStepTypeValue;
  label?: string | null;
  target?: string | null;
  value?: string | null;
};

type Alarm = {
  id: string;
  name: string;
  timeOfDay: string;
  timezone: string;
  daysOfWeek: WeekdayValue[];
  isActive: boolean;
  lastTriggeredSlot: string | null;
  routineSteps: AlarmStep[];
};

const DEFAULT_ALARM = {
  name: "",
  timeOfDay: "07:00",
  timezone: "Europe/Stockholm",
  daysOfWeek: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as WeekdayValue[],
  isActive: true,
  routineSteps: [
    { type: "TURN_ON_DEVICE" as AlarmStepTypeValue, label: "Starta TV", target: "", value: "" },
    { type: "PLAY_MUSIC" as AlarmStepTypeValue, label: "Spela musik", target: "", value: "" },
  ],
};

export function HomeDashboard({
  userName,
}: {
  userName: string;
  userId: string;
  role: "ADMIN" | "USER";
}) {
  const [room, setRoom] = useState<Room>({
    name: "",
    homeAssistantAreaId: "",
    defaultSceneEntityId: "",
    defaultPlaylist: "",
  });
  const [devices, setDevices] = useState<Device[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [n8nConfigured, setN8nConfigured] = useState(false);
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_ALARM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/home");
    if (!res.ok) return;
    const data = await res.json();
    setRoom({
      name: data.room?.name ?? `${userName}s rum`,
      homeAssistantAreaId: data.room?.homeAssistantAreaId ?? "",
      defaultSceneEntityId: data.room?.defaultSceneEntityId ?? "",
      defaultPlaylist: data.room?.defaultPlaylist ?? "",
    });
    setDevices(data.devices ?? []);
    setAlarms(data.alarms ?? []);
    setN8nConfigured(Boolean(data.integration?.n8nConfigured));
  }, [userName]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const primaryDevices = useMemo(
    () => devices.filter((device) => device.isEnabled).slice(0, 4),
    [devices],
  );

  async function sendCommand(device: Device, action: "turn_on" | "play" | "toggle") {
    setBusyId(device.id);
    setStatus("");
    const res = await fetch("/api/home/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: device.id, action }),
    });
    const data = await res.json();
    setBusyId(null);
    setStatus(res.ok ? `${device.label} skickad till n8n.` : (data.error ?? "Kunde inte styra enheten"));
  }

  async function saveSetup() {
    setStatus("");
    const res = await fetch("/api/home/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room,
        devices: devices.map((device) => ({
          id: device.id,
          kind: device.kind,
          label: device.label,
          alias: device.alias,
          entityId: device.entityId,
          isEnabled: device.isEnabled,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "Kunde inte spara rummet");
      return;
    }
    setStatus("Rummet är sparat.");
    await load();
  }

  async function saveAlarm() {
    const res = await fetch(editingId ? `/api/alarms/${editingId}` : "/api/alarms", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "Kunde inte spara larmet");
      return;
    }
    setEditingId(null);
    setForm(DEFAULT_ALARM);
    setStatus(editingId ? "Larmet är uppdaterat." : "Larmet är skapat.");
    await load();
  }

  async function deleteAlarm(id: string) {
    if (!window.confirm("Ta bort larmet?")) return;
    await fetch(`/api/alarms/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <main>
      <section className="relative min-h-screen overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/room.jpg')" }}
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#16312c] via-[#16312c]/35 to-transparent" />

        <div className="relative flex min-h-screen flex-col justify-between px-6 py-8 md:px-12">
          <header className="flex items-start justify-between gap-4">
            <p className="brand text-4xl font-extrabold tracking-tight text-white md:text-6xl">
              XtraHome
            </p>
            <LogoutButton />
          </header>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="max-w-3xl pb-8"
          >
            <h1 className="brand text-5xl font-bold text-white md:text-7xl">{userName}</h1>
            <p className="mt-3 max-w-lg text-lg text-white/85">
              {room.name || "Ditt rum"}. Starta TV, spela musik eller lägg morgonlarm.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {primaryDevices.map((device, index) => (
                <motion.button
                  key={device.id}
                  type="button"
                  disabled={busyId === device.id}
                  onClick={() =>
                    void sendCommand(
                      device,
                      device.kind === "SPEAKER" ? "play" : "turn_on",
                    )
                  }
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + index * 0.08 }}
                  className="min-w-36 bg-white/90 px-5 py-4 text-left text-[#16312c] disabled:opacity-60"
                >
                  <span className="block text-xs uppercase tracking-[0.2em] text-[#215544]">
                    {device.kind === "TV"
                      ? "Bild"
                      : device.kind === "SPEAKER"
                        ? "Ljud"
                        : device.kind === "LIGHT"
                          ? "Ljus"
                          : "Scen"}
                  </span>
                  <span className="mt-1 block text-xl font-semibold">{device.label}</span>
                </motion.button>
              ))}
            </div>
            <p className="mt-4 text-sm text-white/70">
              {n8nConfigured ? "Kopplad mot n8n och Home Assistant." : "n8n är inte konfigurerad än."}
              {status ? ` ${status}` : ""}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="bg-[#eef4f6] px-6 py-16 md:px-12">
        <h2 className="text-3xl font-bold text-[#16312c]">Veckolarm</h2>
        <p className="mt-2 max-w-2xl text-[#215544]">
          Olika tider olika dagar, med flera steg som n8n skickar vidare till rummet.
        </p>

        <div className="mt-8 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <Field
              label="Namn"
              value={form.name}
              onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
              placeholder="Skolveckan"
            />
            <label className="block text-sm text-[#215544]">
              Tid
              <input
                type="time"
                value={form.timeOfDay}
                onChange={(e) => setForm((prev) => ({ ...prev, timeOfDay: e.target.value }))}
                className="mt-1 w-full border-b border-[#16312c]/30 bg-transparent p-2 outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map((day) => {
                const selected = form.daysOfWeek.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        daysOfWeek: selected
                          ? prev.daysOfWeek.filter((value) => value !== day.value)
                          : [...prev.daysOfWeek, day.value],
                      }))
                    }
                    className={`px-3 py-2 text-sm ${
                      selected ? "bg-[#215544] text-white" : "bg-white text-[#16312c]"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            {form.routineSteps.map((step, index) => (
              <div key={`${step.type}-${index}`} className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-[#215544]">
                  Steg {index + 1}
                  <select
                    value={step.type}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        routineSteps: prev.routineSteps.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, type: e.target.value as AlarmStepTypeValue }
                            : item,
                        ),
                      }))
                    }
                    className="mt-1 w-full border-b border-[#16312c]/30 bg-transparent p-2 outline-none"
                  >
                    {ALARM_STEP_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Värde / target"
                  value={step.value ?? step.target ?? ""}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      routineSteps: prev.routineSteps.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, value, target: value } : item,
                      ),
                    }))
                  }
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => void saveAlarm()}
              className="bg-[#b08a3a] px-5 py-3 font-semibold text-[#16312c]"
            >
              {editingId ? "Uppdatera larm" : "Spara larm"}
            </button>
          </div>

          <div className="space-y-4">
            {alarms.length === 0 ? (
              <p className="text-[#215544]">Inga larm ännu.</p>
            ) : (
              alarms.map((alarm) => (
                <article key={alarm.id} className="border-t border-[#16312c]/20 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold">{alarm.name}</h3>
                      <p className="text-sm text-[#215544]">
                        {alarm.daysOfWeek.map((day) => weekdayLabel(day)).join(" ")} · {alarm.timeOfDay}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteAlarm(alarm.id)}
                      className="text-sm underline"
                    >
                      Ta bort
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-[#16312c]/80">
                    {alarm.routineSteps
                      .map((step) => alarmStepTypeLabel(step.type))
                      .join(" → ")}
                  </p>
                  <button
                    type="button"
                    className="mt-2 text-sm underline"
                    onClick={() => {
                      setEditingId(alarm.id);
                      setForm({
                        name: alarm.name,
                        timeOfDay: alarm.timeOfDay,
                        timezone: alarm.timezone,
                        daysOfWeek: alarm.daysOfWeek,
                        isActive: alarm.isActive,
                        routineSteps: alarm.routineSteps.map((step) => ({
                          type: step.type,
                          label: step.label ?? "",
                          target: step.target ?? "",
                          value: step.value ?? "",
                        })),
                      });
                    }}
                  >
                    Redigera
                  </button>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="bg-[#d7e4ea] px-6 py-16 md:px-12">
        <h2 className="text-3xl font-bold text-[#16312c]">Rumskoppling</h2>
        <p className="mt-2 max-w-2xl text-[#215544]">
          Här binds ditt konto till Home Assistant. n8n använder alias, inte hårdkodade id:n i knapparna.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Field
            label="Rumsnamn"
            value={room.name}
            onChange={(value) => setRoom((prev) => ({ ...prev, name: value }))}
          />
          <Field
            label="Home Assistant area"
            value={room.homeAssistantAreaId ?? ""}
            onChange={(value) => setRoom((prev) => ({ ...prev, homeAssistantAreaId: value }))}
            placeholder="oliver_room"
          />
          <Field
            label="Standardscen"
            value={room.defaultSceneEntityId ?? ""}
            onChange={(value) => setRoom((prev) => ({ ...prev, defaultSceneEntityId: value }))}
            placeholder="script.oliver_morgon"
          />
          <Field
            label="Standardspellista"
            value={room.defaultPlaylist ?? ""}
            onChange={(value) => setRoom((prev) => ({ ...prev, defaultPlaylist: value }))}
          />
        </div>
        <div className="mt-8 space-y-4">
          {devices.map((device, index) => (
            <div key={device.id} className="grid gap-3 md:grid-cols-[140px_1fr_1fr]">
              <p className="self-end font-semibold">{device.label}</p>
              <Field
                label="Alias"
                value={device.alias}
                onChange={(value) =>
                  setDevices((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, alias: value } : item,
                    ),
                  )
                }
              />
              <Field
                label="HA entity id"
                value={device.entityId ?? ""}
                onChange={(value) =>
                  setDevices((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, entityId: value } : item,
                    ),
                  )
                }
                placeholder="media_player.oliver_tv"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void saveSetup()}
          className="mt-8 bg-[#16312c] px-5 py-3 font-semibold text-white"
        >
          Spara rum och enheter
        </button>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm text-[#215544]">
      {label}
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border-b border-[#16312c]/30 bg-transparent p-2 outline-none"
      />
    </label>
  );
}
