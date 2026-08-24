import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { dbErrorMessage } from "@/lib/db-error";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await params;
  try {
    const existing = await prisma.room.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Rummet hittades inte" }, { status: 404 });
    }

    await prisma.room.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: dbErrorMessage(error, "Kunde inte ta bort rummet.") },
      { status: 500 },
    );
  }
}
