import { NextResponse } from "next/server";
import { z } from "zod";
import { claimDueAlarms, completeAlarmExecution } from "@/lib/alarm-scheduler";
import { isN8nPollAuthorized } from "@/lib/n8n-auth";

export async function GET(req: Request) {
  if (!isN8nPollAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alarms = await claimDueAlarms();
  return NextResponse.json({ alarms });
}

const completeSchema = z.object({
  executionId: z.string().min(1),
  status: z.enum(["SENT", "FAILED"]),
  errorMessage: z.string().max(500).nullable().optional(),
  responseBody: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  if (!isN8nPollAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = completeSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltig statusrapport" }, { status: 400 });
  }

  const result = await completeAlarmExecution(parsed.data);
  if (!result) {
    return NextResponse.json({ error: "Körningen hittades inte" }, { status: 404 });
  }

  return NextResponse.json(result);
}
