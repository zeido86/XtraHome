import crypto from "node:crypto";

type WebhookPayload = Record<string, unknown>;

function getWebhookUrl() {
  return process.env.N8N_HOME_WEBHOOK_URL ?? "";
}

function getWebhookSecret() {
  return process.env.N8N_WEBHOOK_SECRET ?? "";
}

export function isN8nConfigured() {
  return Boolean(getWebhookUrl() && getWebhookSecret());
}

export async function sendToN8n(event: string, payload: WebhookPayload) {
  const url = getWebhookUrl();
  const secret = getWebhookSecret();
  if (!url || !secret) {
    return {
      ok: false as const,
      status: 500,
      payload: { error: "n8n-webhook är inte konfigurerad" },
    };
  }

  const body = {
    event,
    ...payload,
  };
  const rawBody = JSON.stringify(body);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-xtrahome-signature": signature,
        "x-xtrahome-event": event,
      },
      body: rawBody,
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      payload: text ? safelyParseJson(text) : { ok: response.ok },
    };
  } catch (error) {
    return {
      ok: false as const,
      status: 500,
      payload: {
        error: error instanceof Error ? error.message : "Okänt n8n-fel",
      },
    };
  }
}

function safelyParseJson(text: string) {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}
