import { NextResponse } from "next/server";
import { bucketTrophyMin, parseBucket } from "@/lib/buckets";
import { getRankedMaps } from "@/lib/ranked";
import { getBrawlers } from "@/lib/brawlify";
import { getBansForMap } from "@/lib/bans";
import {
  deriveArchetype,
  findMapBySlug,
  topBrawlersOnMap,
} from "@/lib/wikiData";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ mode: string; slug: string }> }
) {
  const { mode, slug } = await ctx.params;
  const url = new URL(req.url);
  const bucket = parseBucket(url.searchParams.get("bucket"));
  const trophyMin = bucketTrophyMin(bucket);

  const [maps, brawlers] = await Promise.all([
    getRankedMaps(),
    getBrawlers(),
  ]);
  const map = findMapBySlug(maps, mode, slug);
  if (!map) {
    return NextResponse.json({ error: "map not found" }, { status: 404 });
  }

  const [topBrawlers, bans] = await Promise.all([
    topBrawlersOnMap(map.modeCube, map.cubeName, trophyMin).catch(() => []),
    getBansForMap(map.modeCube, map.cubeName, trophyMin).catch(() => []),
  ]);

  const classByCube = new Map(brawlers.map((b) => [b.cubeName, b.className]));
  const archetype = deriveArchetype(topBrawlers, classByCube);

  return NextResponse.json({
    map,
    bucket,
    archetype,
    topBrawlers,
    bans: bans.slice(0, 10),
  });
}
