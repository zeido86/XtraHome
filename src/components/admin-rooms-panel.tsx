"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEVICE_KIND_OPTIONS } from "@/lib/alarm-constants";

type DeviceKind = "TV" | "SPEAKER" | "LIGHT" | "SCENE" | "SWITCH";

type DeviceDraft = {
  id?: string;
  kind: DeviceKind;
  label: string;
  alias: string;
  entityId: string;
  isEnabled: boolean;
};

type AppUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
};

type RoomListItem = {
  id: string;
  name: string;
  homeAssistantAreaId: string | null;
  defaultSceneEntityId: string | null;
  defaultPlaylist: string | null;
  devices: Array<{
    id: string;
    kind: DeviceKind;
    label: string;
    alias: string;
    entityId: string | null;
    isEnabled: boolean;
  }>;
  members: AppUser[];
};

type EditorState = {
  id?: string;
  name: string;
  homeAssistantAreaId: string;
  defaultSceneEntityId: string;
  defaultPlaylist: string;
  memberUserIds: string[];
  devices: DeviceDraft[];
};

function emptyEditor(): EditorState {
  return {
    name: "",
    homeAssistantAreaId: "",
    defaultSceneEntityId: "",
    defaultPlaylist: "",
    memberUserIds: [],
    devices: [],
  };
}

function emptyDevice(): DeviceDraft {
  return {
    kind: "TV",
    label: "",
    alias: "",
    entityId: "",
    isEnabled: true,
  };
}

export function AdminRoomsPanel() {
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const editingIdRef = useRef<string | undefined>(undefined);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/rooms");
    if (!res.ok) return;
    const data = await res.json();
    const nextRooms = (data.rooms ?? []) as RoomListItem[];
    setRooms(nextRooms);
    setUsers(data.users ?? []);

    if (editingIdRef.current) {
      const current = nextRooms.find((room) => room.id === editingIdRef.current);
      if (current) openEditor(current);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function openEditor(room?: RoomListItem) {
    if (!room) {
      editingIdRef.current = undefined;
      setEditor(emptyEditor());
      setStatus("");
      return;
    }
    editingIdRef.current = room.id;
    setEditor({
      id: room.id,
      name: room.name,
      homeAssistantAreaId: room.homeAssistantAreaId ?? "",
      defaultSceneEntityId: room.defaultSceneEntityId ?? "",
      defaultPlaylist: room.defaultPlaylist ?? "",
      memberUserIds: room.members.map((member) => member.id),
      devices: room.devices.map((device) => ({
        id: device.id,
        kind: device.kind,
        label: device.label,
        alias: device.alias,
        entityId: device.entityId ?? "",
        isEnabled: device.isEnabled,
      })),
    });
    setStatus("");
  }

  function toggleMember(userId: string) {
    setEditor((prev) => {
      if (!prev) return prev;
      const exists = prev.memberUserIds.includes(userId);
      return {
        ...prev,
        memberUserIds: exists
          ? prev.memberUserIds.filter((id) => id !== userId)
          : [...prev.memberUserIds, userId],
      };
    });
  }

  async function save() {
    if (!editor) return;
    setSaving(true);
    setStatus("");
    const res = await fetch("/api/admin/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editor.id,
        room: {
          name: editor.name,
          homeAssistantAreaId: editor.homeAssistantAreaId,
          defaultSceneEntityId: editor.defaultSceneEntityId,
          defaultPlaylist: editor.defaultPlaylist,
        },
        memberUserIds: editor.memberUserIds,
        devices: editor.devices
          .filter((device) => device.label.trim())
          .map((device) => ({
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
    setSaving(false);
    if (!res.ok) {
      setStatus(data.error ?? "Kunde inte spara rummet");
      return;
    }
    editingIdRef.current = data.room?.id;
    setStatus("Rummet är sparat.");
    await load();
  }

  async function removeRoom(roomId: string) {
    if (!window.confirm("Ta bort rummet och alla dess enheter?")) return;
    const res = await fetch(`/api/admin/rooms/${roomId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setStatus(data.error ?? "Kunde inte ta bort rummet");
      return;
    }
    if (editingIdRef.current === roomId) {
      editingIdRef.current = undefined;
      setEditor(null);
    }
    await load();
  }

  return (
    <section className="bg-[#d7e4ea] px-6 py-16 md:px-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#16312c]">Rum</h2>
          <p className="mt-2 max-w-2xl text-[#215544]">
            Skapa rum, knyt användare och lägg till så många enheter du vill.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openEditor()}
          className="bg-[#16312c] px-5 py-3 font-semibold text-white"
        >
          Nytt rum
        </button>
      </div>

      <div className="mt-8 space-y-4">
        {rooms.length === 0 ? (
          <p className="text-[#215544]">Inga rum ännu. Skapa det första.</p>
        ) : (
          rooms.map((room) => (
            <article
              key={room.id}
              className="border-t border-[#16312c]/20 pt-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-[#16312c]">{room.name}</h3>
                  <p className="mt-1 text-sm text-[#215544]">
                    Användare:{" "}
                    {room.members.length
                      ? room.members.map((member) => member.name).join(", ")
                      : "Ingen knuten"}
                  </p>
                  <p className="text-sm text-[#215544]">
                    Enheter:{" "}
                    {room.devices.length
                      ? room.devices.map((device) => device.label).join(", ")
                      : "Inga"}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => openEditor(room)}
                    className="text-sm underline"
                  >
                    Redigera
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeRoom(room.id)}
                    className="text-sm underline"
                  >
                    Ta bort
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {editor ? (
        <div className="mt-12 space-y-6 border-t border-[#16312c]/30 pt-8">
          <h3 className="text-2xl font-semibold text-[#16312c]">
            {editor.id ? "Redigera rum" : "Nytt rum"}
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Rumsnamn"
              value={editor.name}
              onChange={(value) => setEditor((prev) => (prev ? { ...prev, name: value } : prev))}
              placeholder="Olivers rum"
            />
            <Field
              label="Home Assistant area"
              value={editor.homeAssistantAreaId}
              onChange={(value) =>
                setEditor((prev) => (prev ? { ...prev, homeAssistantAreaId: value } : prev))
              }
              placeholder="oliver_room"
            />
            <Field
              label="Standardscen"
              value={editor.defaultSceneEntityId}
              onChange={(value) =>
                setEditor((prev) => (prev ? { ...prev, defaultSceneEntityId: value } : prev))
              }
            />
            <Field
              label="Standardspellista"
              value={editor.defaultPlaylist}
              onChange={(value) =>
                setEditor((prev) => (prev ? { ...prev, defaultPlaylist: value } : prev))
              }
            />
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-[#16312c]">Knyt användare</p>
            <div className="flex flex-wrap gap-2">
              {users.map((user) => {
                const selected = editor.memberUserIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleMember(user.id)}
                    className={`px-3 py-2 text-sm ${
                      selected ? "bg-[#215544] text-white" : "bg-white text-[#16312c]"
                    }`}
                  >
                    {user.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#16312c]">Enheter</p>
              <button
                type="button"
                onClick={() =>
                  setEditor((prev) =>
                    prev ? { ...prev, devices: [...prev.devices, emptyDevice()] } : prev,
                  )
                }
                className="bg-white px-4 py-2 text-sm text-[#16312c]"
              >
                Lägg till enhet
              </button>
            </div>

            {editor.devices.length === 0 ? (
              <p className="text-sm text-[#215544]">Inga enheter ännu.</p>
            ) : (
              editor.devices.map((device, index) => (
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
                  />
                  <Field
                    label="Alias"
                    value={device.alias}
                    onChange={(value) => updateDevice(index, { alias: value })}
                    placeholder="tv"
                  />
                  <Field
                    label="HA entity id"
                    value={device.entityId}
                    onChange={(value) => updateDevice(index, { entityId: value })}
                    placeholder="media_player.oliver_tv"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setEditor((prev) =>
                        prev
                          ? {
                              ...prev,
                              devices: prev.devices.filter((_, itemIndex) => itemIndex !== index),
                            }
                          : prev,
                      )
                    }
                    className="justify-self-start text-sm underline"
                  >
                    Ta bort enhet
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving || editor.name.trim().length < 2}
              onClick={() => void save()}
              className="bg-[#16312c] px-5 py-3 font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Sparar..." : "Spara rum"}
            </button>
            <button
              type="button"
              onClick={() => {
                editingIdRef.current = undefined;
                setEditor(null);
              }}
              className="bg-white px-5 py-3 text-[#16312c]"
            >
              Stäng
            </button>
          </div>
          {status ? <p className="text-sm text-[#16312c]">{status}</p> : null}
        </div>
      ) : null}
    </section>
  );

  function updateDevice(index: number, patch: Partial<DeviceDraft>) {
    setEditor((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        devices: prev.devices.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...patch } : item,
        ),
      };
    });
  }
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
