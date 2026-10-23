import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { ensureSeedUsersAndData } from "@/lib/seed-helper";
import DashboardClient from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureSeedUsersAndData();

  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  return <DashboardClient initialUser={session} />;
}
