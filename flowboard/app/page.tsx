import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { seedDemoWorkspace } from "@/lib/queries";
import { Dashboard } from "./Dashboard";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await seedDemoWorkspace();

  return <Dashboard />;
}
