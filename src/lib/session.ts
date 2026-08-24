import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AdminUser = { id: string; name: string; role: "ADMIN" };

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAdmin(): Promise<
  { user: AdminUser; error?: undefined } | { user?: undefined; error: NextResponse }
> {
  const session = await getSession();
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, role: true },
  });

  if (!user || user.role !== "ADMIN") {
    return {
      error: NextResponse.json(
        {
          error:
            "Du är inte inloggad som admin. Logga ut och in som Anders eller Sandra.",
        },
        { status: 401 },
      ),
    };
  }

  return { user: { id: user.id, name: user.name, role: "ADMIN" } };
}
