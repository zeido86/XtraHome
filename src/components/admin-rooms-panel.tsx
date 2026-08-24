"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEVICE_KIND_OPTIONS } from "@/lib/alarm-constants";

type DeviceKind = "TV" | "SPEAKER" | "LIGHT" | "SCENE" | "SWITCH";

type Device = {
  id?: string;
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

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  room: Room | null;
  devices: Device[];
};

function emptyDevice(): Device {
  return {
    kind: "TV",
    label: "",
    alias: "",
    entityId: "",
    isEnabled: true,
  };
}

export function AdminRoomsPanel() {
  const selectedIdRef = useRef("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [room, setRoom] = useState<Room>({
    name: "",
    homeAssistantAreaId: "",
    defaultSceneEntityId: "",
    defaultPlaylist: "",
  });
  const [devices, setDevices] = useState<Device[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/rooms");
    if (!res.ok) return;
    const data = await res.json();
    const nextUsers = (data.users ?? []) as AdminUser[];
    setUsers(nextUsers);
    const currentId = selectedIdRef.current;
    const nextId =
      currentId && nextUsers.some((user) => user.id === currentId)
        ? currentId
        : (nextUsers[0]?.id ?? "");
    if (nextId) {
      applyUser(nextUsers.find((user) => user.id === nextId) ?? nextUsers[0]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function applyUser(user?: AdminUser) {
    if (!user) return;
    selectedIdRef.current = user.id;
    setSelectedId(user.id);
    setRoom({
      name: user.room?.name ?? `${user.name}s rum`,
      homeAssistantAreaId: user.room?.homeAssistantAreaId ?? "",
      defaultSceneEntityId: user.room?.defaultSceneEntityId ?? "",
      defaultPlaylist: user.room?.defaultPlaylist ?? "",
    });
    setDevices(
      user.devices.length
        ? user.devices.map((device) => ({
            ...device,
            entityId: device.entityId ?? "",
          }))
        : [emptyDevice()],
    );
    setStatus("");
  }

  async function save() {
    setSaving(true);
    setStatus("");
    const res = await fetch("/api/home/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedId,
        room,
        devices: devices
          .filter((device) => device.label.trim())
          .map((device, index) => ({
            id: device.id,
            kind: device.kind,
            label: device.label,
            alias: device.alias.trim() || slug(device.label, index),
            entityId: device.entityId,
            isEnabled: device.isEnabled,
          })),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setStatus(data.error ?? "Kunde inte spara rummet");
      return;
    }
    setStatus("Rummet är sparat.");
    await load();
  }

  const selected = users.find((user) => user.id === selectedId);

  return (
    <section className="bg-[#d7e4ea] px-6 py-16 md:px-12">
      <h2 className="text-3xl font-bold text-[#16312c]">Rum och enheter</h2>
      <p className="mt-2 max-w-2xl text-[#215544]">
        Här knyter du varje persons rum till Home Assistant. Användarna ser bara
        knapparna och kan lägga larm.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {users.map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => applyUser(user)}
            className={`px-4 py-2 text-sm ${
              selectedId === user.id
                ? "bg-[#16312c] text-white"
                : "bg-white text-[#16312c]"
            }`}
          >
            {user.name}
          </button>
        ))}
      </div>

      {selected ? (
        <div className="mt-8 space-y-6">
          <p className="text-sm text-[#215544]">
            Redigerar {selected.name}
            {selected.role === "ADMIN" ? " (admin)" : ""}.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Rumsnamn"
              value={room.name}
              onChange={(value) => setRoom((prev) => ({ ...prev, name: value }))}
            />
            <Field
              label="Home Assistant area"
              value={room.homeAssistantAreaId ?? ""}
              onChange={(value) =>
                setRoom((prev) => ({ ...prev, homeAssistantAreaId: value }))
              }
              placeholder="oliver_room"
            />
            <Field
              label="Standardscen"
              value={room.defaultSceneEntityId ?? ""}
              onChange={(value) =>
                setRoom((prev) => ({ ...prev, defaultSceneEntityId: value }))
              }
              placeholder="script.oliver_morgon"
            />
            <Field
              label="Standardspellista"
              value={room.defaultPlaylist ?? ""}
              onChange={(value) =>
                setRoom((prev) => ({ ...prev, defaultPlaylist: value }))
              }
            />
          </div>

          <div className="space-y-4">
            {devices.map((device, index) => (
              <div
                key={device.id ?? `new-${index}`}
                className="grid gap-3 border-t border-[#16312c]/15 pt-4 md:grid-cols-4"
              >
                <label className="text-sm text-[#215544]">
                  Typ
                  <select
                    value={device.kind}
                    onChange={(e) =>
                      updateDevice(index, { kind: e.target.value as DeviceKind })
                    }
                    className="mt-1 w-full border-b border-[#16312c]/30 bg-transparent p-2 outline-none"
                  >
                    {DEVICE_KIND_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Namn i appen"
                  value={device.label}
                  onChange={(value) => updateDevice(index, { label: value })}
                  placeholder="TV"
                />
                <Field
                  label="Alias"
                  value={device.alias}
                  onChange={(value) => updateDevice(index, { alias: value })}
                  placeholder="tv"
                />
                <Field
                  label="HA entity id"
                  value={device.entityId ?? ""}
                  onChange={(value) => updateDevice(index, { entityId: value })}
                  placeholder="media_player.oliver_tv"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDevices((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                  }
                  className="justify-self-start text-sm underline"
                >
                  Ta bort enhet
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setDevices((prev) => [...prev, emptyDevice()])}
              className="bg-white px-4 py-3 text-[#16312c]"
            >
              Lägg till enhet
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="bg-[#16312c] px-5 py-3 font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Sparar..." : "Spara rum och enheter"}
            </button>
          </div>
          {status ? <p className="text-sm text-[#16312c]">{status}</p> : null}
        </div>
      ) : null}
    </section>
  );

  function updateDevice(index: number, patch: Partial<Device>) {
    setDevices((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }
}

function slug(label: string, index: number) {
  const value = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return value.length >= 2 ? value : `enhet-${index + 1}`;
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
