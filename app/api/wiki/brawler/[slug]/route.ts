import { NextResponse } from "next/server";
import { bucketTrophyMin, parseBucket } from "@/lib/buckets";
import {
  bestAlliesForBrawler,
  bestGadgets,
  bestGears,
  bestMapsForBrawler,
  bestStarPowers,
  brawlerBaseline,
  easiestMatchupsForBrawler,
  findBrawlerBySlug,
  getBrawlerDetail,
  getGearNames,
  worstMatchupsForBrawler,
} from "@/lib/wikiData";
import { getBrawlers } from "@/lib/brawlify";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const bucket = parseBucket(url.searchParams.get("bucket"));
  const trophyMin = bucketTrophyMin(bucket);

  const brawlers = await getBrawlers();
  const brawler = findBrawlerBySlug(brawlers, slug);
  if (!brawler) {
    return NextResponse.json({ error: "brawler not found" }, { status: 404 });
  }

  const [
    detail,
    gearNames,
    gadgets,
    starPowers,
    gears,
    bestMaps,
    bestAllies,
    worstEnemies,
    bestEnemies,
    baseline,
  ] = await Promise.all([
    getBrawlerDetail(brawler.id).catch(() => null),
    getGearNames(),
    bestGadgets(brawler.cubeName, trophyMin).catch(() => []),
    bestStarPowers(brawler.cubeName, trophyMin).catch(() => []),
    bestGears(brawler.cubeName, trophyMin).catch(() => []),
    bestMapsForBrawler(brawler.cubeName, trophyMin).catch(() => []),
    bestAlliesForBrawler(brawler.cubeName, trophyMin).catch(() => []),
    worstMatchupsForBrawler(brawler.cubeName, trophyMin).catch(() => []),
    easiestMatchupsForBrawler(brawler.cubeName, trophyMin).catch(() => []),
    brawlerBaseline(brawler.cubeName, trophyMin).catch(() => null),
  ]);

  const gadgetById = new Map<number, { name: string; description: string }>();
  for (const g of detail?.gadgets ?? []) {
    gadgetById.set(g.id, { name: g.name, description: g.description });
  }
  const spById = new Map<number, { name: string; description: string }>();
  for (const sp of detail?.starPowers ?? []) {
    spById.set(sp.id, { name: sp.name, description: sp.description });
  }

  return NextResponse.json({
    brawler,
    detail: detail
      ? {
          description: detail.description,
          rarity: detail.rarity?.name,
          rarityColor: detail.rarity?.color,
          className: detail.class?.name,
          gadgets: detail.gadgets,
          starPowers: detail.starPowers,
        }
      : null,
    baseline,
    bucket,
    bestBuild: {
      gadgets: gadgets.map((g) => ({
        ...g,
        name: gadgetById.get(Number(g.id))?.name,
        description: gadgetById.get(Number(g.id))?.description,
      })),
      starPowers: starPowers.map((s) => ({
        ...s,
        name: spById.get(Number(s.id))?.name,
        description: spById.get(Number(s.id))?.description,
      })),
      gears: gears.map((g) => ({
        ...g,
        name: gearNames.get(Number(g.id)),
      })),
    },
    bestMaps,
    bestAllies,
    worstEnemies,
    bestEnemies,
  });
}
