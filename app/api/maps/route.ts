import { NextResponse } from "next/server";
import { getMaps } from "@/lib/brawlify";
import { getRankedMaps } from "@/lib/ranked";

export const revalidate = 21600;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ranked = url.searchParams.get("ranked") === "true";
  const maps = ranked ? await getRankedMaps() : await getMaps();
  return NextResponse.json({ maps });
}
