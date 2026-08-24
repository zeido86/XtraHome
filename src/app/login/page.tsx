"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });
    if (result?.error) {
      setError("Fel namn eller lösenord");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/room.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#16312c]/80 via-[#16312c]/45 to-transparent" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-end px-6 py-12 md:justify-center">
        <p className="brand text-5xl font-extrabold tracking-tight text-white md:text-7xl">
          XtraHome
        </p>
        <p className="mt-3 max-w-md text-lg text-white/85">
          Ditt rum. Dina grejer. Ett gränssnitt för just dig.
        </p>

        <form onSubmit={onSubmit} className="mt-10 w-full max-w-sm space-y-3">
          <input
            className="w-full border-0 border-b border-white/50 bg-transparent p-3 text-white outline-none placeholder:text-white/60"
            placeholder="Namn"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
          <input
            className="w-full border-0 border-b border-white/50 bg-transparent p-3 text-white outline-none placeholder:text-white/60"
            placeholder="Lösenord"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error ? <p className="text-sm text-amber-200">{error}</p> : null}
          <button className="mt-4 bg-[#b08a3a] px-6 py-3 font-semibold text-[#16312c]">
            Öppna rummet
          </button>
        </form>
      </div>
    </main>
  );
}
