"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminRoomsPanel } from "@/components/admin-rooms-panel";
import { LogoutButton } from "@/components/logout-button";
import {
  USER_ALARM_STEP_TYPE_OPTIONS,
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
  roomId: string;
  roomName: string;
};

type Room = {
  id: string;
  name: string;
  devices: Array<{
    id: string;
    kind: DeviceKind;
    label: string;
    alias: string;
    entityId: string | null;
    isEnabled: boolean;
  }>;
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
    { type: "TURN_ON_DEVICE" as AlarmStepTypeValue, label: "", target: "", value: "" },
  ],
};

export function HomeDashboard({
  userName,
  role,
}: {
  userName: string;
  userId: string;
  role: "ADMIN" | "USER";
}) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [n8nConfigured, setN8nConfigured] = useState(false);
  const [status, setStatus] = useState("");
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_ALARM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError("");
    const res = await fetch("/api/home");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoadError(
        data.error ??
          "Kunde inte läsa hemdata. Kör Database Sync + seed i GitHub om databasen saknar nya tabeller.",
      );
      return;
    }
    setRooms(data.rooms ?? []);
    setDevices(data.devices ?? []);
    setAlarms(data.alarms ?? []);
    setN8nConfigured(Boolean(data.integration?.n8nConfigured));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const heroDevices = useMemo(
    () => devices.filter((device) => device.isEnabled).slice(0, 6),
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
    setStatus(
      res.ok
        ? `${device.label} i ${device.roomName} skickad till n8n.`
        : (data.error ?? "Kunde inte styra enheten"),
    );
  }

  function updateStep(
    index: number,
    patch: Partial<(typeof DEFAULT_ALARM)["routineSteps"][number]>,
  ) {
    setForm((prev) => ({
      ...prev,
      routineSteps: prev.routineSteps.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  async function saveAlarm() {
    const res = await fetch(editingId ? `/api/alarms/${editingId}` : "/api/alarms", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        routineSteps: form.routineSteps.map((step) => ({
          ...step,
          label:
            step.label ||
            devices.find((device) => device.id === step.target)?.label ||
            null,
        })),
      }),
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
      <section className="relative min-h-[70vh] overflow-hidden md:min-h-screen">
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/room.jpg')" }}
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#16312c] via-[#16312c]/35 to-transparent" />

        <div className="relative flex min-h-[70vh] flex-col justify-between px-6 py-8 md:min-h-screen md:px-12">
          <header className="flex items-start justify-between gap-4">
            <div>
              <p className="brand text-4xl font-extrabold tracking-tight text-white md:text-6xl">
                XtraHome
              </p>
              <p className="mt-1 text-sm text-white/70">
                Inloggad som {userName} ({role === "ADMIN" ? "admin" : "användare"})
              </p>
            </div>
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
              {rooms.length
                ? `Dina rum: ${rooms.map((room) => room.name).join(", ")}.`
                : "Du är inte knuten till något rum ännu."}
            </p>
            {role === "ADMIN" ? (
              <a
                href="#admin-rum"
                className="mt-6 inline-block bg-[#b08a3a] px-5 py-3 font-semibold text-[#16312c]"
              >
                Hantera rum
              </a>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              {heroDevices.map((device, index) => (
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
                    {device.roomName}
                  </span>
                  <span className="mt-1 block text-xl font-semibold">{device.label}</span>
                </motion.button>
              ))}
            </div>
            <p className="mt-4 text-sm text-white/70">
              {n8nConfigured ? "Kopplad mot n8n och Home Assistant." : "n8n är inte konfigurerad än."}
              {status ? ` ${status}` : ""}
            </p>
            {loadError ? (
              <p className="mt-3 max-w-xl bg-black/40 p-3 text-sm text-amber-100">{loadError}</p>
            ) : null}
          </motion.div>
        </div>
      </section>

      {role === "ADMIN" ? (
        <div id="admin-rum">
          <AdminRoomsPanel />
        </div>
      ) : null}

      {rooms.map((room) => (
        <section key={room.id} className="bg-[#eef4f6] px-6 py-12 md:px-12">
          <h2 className="text-3xl font-bold text-[#16312c]">{room.name}</h2>
          <p className="mt-2 text-[#215544]">Enheter i rummet.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {room.devices.filter((device) => device.isEnabled).length === 0 ? (
              <p className="text-sm text-[#215544]">Inga enheter i det här rummet ännu.</p>
            ) : (
              room.devices
                .filter((device) => device.isEnabled)
                .map((device) => (
                  <button
                    key={device.id}
                    type="button"
                    disabled={busyId === device.id}
                    onClick={() =>
                      void sendCommand(
                        {
                          ...device,
                          roomId: room.id,
                          roomName: room.name,
                        },
                        device.kind === "SPEAKER" ? "play" : "turn_on",
                      )
                    }
                    className="min-w-32 bg-white px-4 py-3 text-left text-[#16312c] disabled:opacity-60"
                  >
                    <span className="block text-xs uppercase tracking-[0.16em] text-[#215544]">
                      {device.kind}
                    </span>
                    <span className="mt-1 block font-semibold">{device.label}</span>
                  </button>
                ))
            )}
          </div>
        </section>
      ))}

      <section className="bg-[#f7fafb] px-6 py-16 md:px-12">
        <h2 className="text-3xl font-bold text-[#16312c]">Veckolarm</h2>
        <p className="mt-2 max-w-2xl text-[#215544]">
          Välj dagar och tid. Stegen använder enheter från rummen du är knuten till.
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
                      updateStep(index, { type: e.target.value as AlarmStepTypeValue })
                    }
                    className="mt-1 w-full border-b border-[#16312c]/30 bg-transparent p-2 outline-none"
                  >
                    {USER_ALARM_STEP_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {step.type === "WAIT" ? (
                  <Field
                    label="Sekunder"
                    value={step.value ?? ""}
                    onChange={(value) => updateStep(index, { value })}
                    placeholder="10"
                  />
                ) : (
                  <>
                    <label className="text-sm text-[#215544]">
                      Enhet
                      <select
                        value={step.target ?? ""}
                        onChange={(e) => updateStep(index, { target: e.target.value })}
                        className="mt-1 w-full border-b border-[#16312c]/30 bg-transparent p-2 outline-none"
                      >
                        <option value="">Välj enhet</option>
                        {devices
                          .filter((device) => device.isEnabled)
                          .map((device) => (
                            <option key={device.id} value={device.id}>
                              {device.roomName}: {device.label}
                            </option>
                          ))}
                      </select>
                    </label>
                    {step.type === "SET_VOLUME" ? (
                      <Field
                        label="Volym (0-100)"
                        value={step.value ?? ""}
                        onChange={(value) => updateStep(index, { value })}
                        placeholder="25"
                      />
                    ) : null}
                  </>
                )}
                {form.routineSteps.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        routineSteps: prev.routineSteps.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      }))
                    }
                    className="text-left text-sm underline"
                  >
                    Ta bort steg
                  </button>
                ) : null}
              </div>
            ))}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    routineSteps: [
                      ...prev.routineSteps,
                      {
                        type: "TURN_ON_DEVICE",
                        label: "",
                        target: devices[0]?.id ?? "",
                        value: "",
                      },
                    ],
                  }))
                }
                className="bg-white px-4 py-3 text-[#16312c]"
              >
                Lägg till steg
              </button>
              <button
                type="button"
                onClick={() => void saveAlarm()}
                className="bg-[#b08a3a] px-5 py-3 font-semibold text-[#16312c]"
              >
                {editingId ? "Uppdatera larm" : "Spara larm"}
              </button>
            </div>
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
                        {alarm.daysOfWeek.map((day) => weekdayLabel(day)).join(" ")} ·{" "}
                        {alarm.timeOfDay}
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
