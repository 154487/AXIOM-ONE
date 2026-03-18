import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendProfileUpdatedEmail } from "@/lib/email";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  if (!email || typeof email !== "string" || !email.includes("@") || !email.includes(".")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { email: email.trim(), NOT: { id: session.user.id } },
  });

  if (existing) {
    return NextResponse.json({ error: "Email já está em uso" }, { status: 409 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { name: name.trim(), email: email.trim() },
    select: { id: true, name: true, email: true },
  });

  // Detect what changed and send email (fire-and-forget)
  if (currentUser) {
    const changes: { field: string; label: string }[] = [];
    if (currentUser.name !== name.trim()) changes.push({ field: "name", label: "Nome" });
    if (currentUser.email !== email.trim()) changes.push({ field: "email", label: "Email" });

    if (changes.length > 0) {
      // Send to OLD email so user is notified even if email changed
      sendProfileUpdatedEmail({
        to: currentUser.email,
        name: currentUser.name,
        changes,
      }).catch(() => {});
    }
  }

  return NextResponse.json(updated);
}
