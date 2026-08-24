"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        void signOut({ callbackUrl: `${origin}/login` });
      }}
      className="text-sm tracking-wide text-white/80 underline-offset-4 hover:text-white hover:underline"
    >
      Logga ut
    </button>
  );
}
