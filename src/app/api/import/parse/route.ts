import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseFile } from "@/lib/import/parseFile";

const ALLOWED_EXTENSIONS = ["ofx", "csv", "xlsx", "xls"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: `Formato não suportado. Use: ${ALLOWED_EXTENSIONS.join(", ")}` },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande. Máximo: 5MB" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = await parseFile(buffer, file.name);
    return NextResponse.json(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao processar arquivo";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
