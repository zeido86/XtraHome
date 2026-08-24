import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { HomeDashboard } from "@/components/home-dashboard";

export default async function HomePage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <HomeDashboard
      userName={session.user.name ?? "du"}
      userId={session.user.id}
      role={session.user.role}
    />
  );
}
