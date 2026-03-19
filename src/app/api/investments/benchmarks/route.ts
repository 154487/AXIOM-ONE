import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchBenchmarks } from "@/lib/benchmarks";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await fetchBenchmarks();
  return NextResponse.json(data);
}
