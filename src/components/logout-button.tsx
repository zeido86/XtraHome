"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm tracking-wide text-white/80 underline-offset-4 hover:text-white hover:underline"
    >
      Logga ut
    </button>
  );
}
