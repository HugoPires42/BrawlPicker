import { NextResponse } from "next/server";
import { getBrawlers } from "@/lib/brawlify";
import { warmGlobal } from "@/lib/matchups";

export const revalidate = 21600;

export async function GET() {
  const brawlers = await getBrawlers();
  warmGlobal();
  return NextResponse.json({ brawlers });
}
