import type { NextConfig } from "next";

function resolveAuthUrl() {
  const explicit = process.env.NEXTAUTH_URL?.trim();
  if (explicit) return explicit;

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const host = vercelUrl.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  return "http://localhost:3000";
}

process.env.NEXTAUTH_URL = resolveAuthUrl();

const nextConfig: NextConfig = {};

export default nextConfig;
