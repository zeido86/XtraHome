import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.room.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Rummet hittades inte" }, { status: 404 });
  }

  await prisma.room.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
