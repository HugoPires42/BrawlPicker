import { NextResponse } from "next/server";
import { getBansForMap } from "@/lib/bans";

export async function POST(req: Request) {
  const { mode, map } = (await req.json()) as { mode: string; map: string };
  if (!mode || !map) {
    return NextResponse.json(
      { error: "mode and map required" },
      { status: 400 }
    );
  }
  const bans = await getBansForMap(mode, map);
  return NextResponse.json({ bans });
}
