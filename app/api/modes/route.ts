import { NextResponse } from "next/server";
import { getRankedMaps } from "@/lib/ranked";
import type { GameMode } from "@/lib/types";

// Don't pre-render at build time — depends on the live cube auth.
export const dynamic = "force-dynamic";

export async function GET() {
  const maps = await getRankedMaps();
  const byCube = new Map<string, GameMode>();
  for (const m of maps) {
    const existing = byCube.get(m.modeCube);
    if (existing) {
      existing.mapCount += 1;
    } else {
      byCube.set(m.modeCube, {
        name: m.modeName,
        cube: m.modeCube,
        color: m.modeColor,
        imageUrl: m.modeImageUrl,
        mapCount: 1,
      });
    }
  }
  const modes = [...byCube.values()].sort((a, b) => b.mapCount - a.mapCount);
  return NextResponse.json({ modes });
}
