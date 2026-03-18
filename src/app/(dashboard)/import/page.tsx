import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ImportWizard } from "@/components/import/ImportWizard";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <ImportWizard categories={categories} />
    </div>
  );
}
