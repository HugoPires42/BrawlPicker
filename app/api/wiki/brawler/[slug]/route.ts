import { NextResponse } from "next/server";
import { bucketTrophyMin, parseBucket } from "@/lib/buckets";
import { getTips } from "@/lib/brawlerTips";
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
import { getRankedMaps } from "@/lib/ranked";

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
    rankedMaps,
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
    getRankedMaps().catch(() => []),
  ]);

  // Enrich best maps with image + display name from the ranked-maps catalog.
  const rankedByKey = new Map(
    rankedMaps.map((m) => [`${m.modeCube}::${m.cubeName}`, m])
  );
  const bestMapsEnriched = bestMaps.map((m) => {
    const gm = rankedByKey.get(`${m.mode}::${m.map}`);
    return {
      ...m,
      name: gm?.name ?? m.map,
      modeName: gm?.modeName,
      modeColor: gm?.modeColor,
      imageUrl: gm?.imageUrl,
    };
  });

  const gadgetById = new Map<
    number,
    { name: string; description: string; imageUrl?: string }
  >();
  for (const g of detail?.gadgets ?? []) {
    gadgetById.set(g.id, {
      name: g.name,
      description: g.description,
      imageUrl: g.imageUrl,
    });
  }
  const spById = new Map<
    number,
    { name: string; description: string; imageUrl?: string }
  >();
  for (const sp of detail?.starPowers ?? []) {
    spById.set(sp.id, {
      name: sp.name,
      description: sp.description,
      imageUrl: sp.imageUrl,
    });
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
      gadgets: gadgets.map((g) => {
        const meta = gadgetById.get(Number(g.id));
        return {
          ...g,
          name: meta?.name,
          description: meta?.description,
          imageUrl: meta?.imageUrl,
        };
      }),
      starPowers: starPowers.map((s) => {
        const meta = spById.get(Number(s.id));
        return {
          ...s,
          name: meta?.name,
          description: meta?.description,
          imageUrl: meta?.imageUrl,
        };
      }),
      gears: gears.map((g) => ({
        ...g,
        name: gearNames.get(Number(g.id)),
      })),
    },
    bestMaps: bestMapsEnriched,
    bestAllies,
    worstEnemies,
    bestEnemies,
    tips: getTips(brawler.cubeName, brawler.className),
  });
}
