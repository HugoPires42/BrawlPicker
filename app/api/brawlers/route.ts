import { NextResponse } from "next/server";
import { getBrawlers } from "@/lib/brawlify";
import { warmGlobal } from "@/lib/matchups";

export const dynamic = "force-dynamic";

export async function GET() {
  const brawlers = await getBrawlers();
  warmGlobal();
  return NextResponse.json({ brawlers });
}
