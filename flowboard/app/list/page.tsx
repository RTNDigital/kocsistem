import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ListScreen } from "./ListScreen";

export const metadata = { title: "List — KocSistemBoard" };

export default async function ListPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <ListScreen />;
}
