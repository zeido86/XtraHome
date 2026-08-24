import { redirect } from "next/navigation";
import { HomeDashboard } from "@/components/home-dashboard";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  let userName = session.user.name ?? "du";
  let role: "ADMIN" | "USER" = session.user.role ?? "USER";
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, role: true },
    });
    if (dbUser) {
      userName = dbUser.name;
      role = dbUser.role;
    }
  } catch {
    // Fall back to the JWT if the database is unavailable.
  }

  return (
    <HomeDashboard
      userName={userName}
      userId={session.user.id}
      role={role}
    />
  );
}
