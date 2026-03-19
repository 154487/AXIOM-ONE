export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { JournalShell } from "@/components/journal/JournalShell";

export default async function JournalPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <JournalShell />;
}
