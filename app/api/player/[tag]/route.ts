import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Fetch a player's Brawl Stars profile from the official Supercell API.
 *
 * Returns the player's owned brawlers with their power level, so the draft
 * UI can filter recommendations to brawlers actually playable on the
 * account.
 *
 * Token: read from process.env.BRAWLSTARS_TOKEN (`.env.local` in dev, env
 * var on Render in prod). The token is IP-locked at Supercell's side —
 * regenerate it on developer.brawlstars.com with the deployment's egress
 * IP in the allow list.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ tag: string }> }
) {
  const { tag } = await ctx.params;
  const cleanTag = tag.replace(/^[#%23]+/, "").toUpperCase();
  if (!cleanTag) {
    return NextResponse.json({ error: "tag required" }, { status: 400 });
  }

  const token = process.env.BRAWLSTARS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "TOKEN_MISSING" }, { status: 503 });
  }

  // If BRAWLTIME_PROXY is set (Cloudflare Worker URL), route through it.
  // The Worker runs from Cloudflare's IP ranges, which are stable enough to
  // whitelist in a Supercell developer token's CIDR list — necessary on
  // Render free tier where the egress IP rotates.
  const proxy = process.env.BRAWLTIME_PROXY?.replace(/\/+$/, "");
  const url = proxy
    ? `${proxy}/supercell/v1/players/%23${cleanTag}`
    : `https://api.brawlstars.com/v1/players/%23${cleanTag}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "FETCH_FAILED", detail: (e as Error).message },
      { status: 502 }
    );
  }

  if (res.status === 404) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (res.status === 403) {
    return NextResponse.json({ error: "TOKEN_IP" }, { status: 403 });
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: "GENERIC", status: res.status },
      { status: res.status }
    );
  }

  type RawBrawler = {
    id: number;
    name: string;
    power: number;
    rank?: number;
    trophies?: number;
  };
  type RawPlayer = {
    tag: string;
    name: string;
    brawlers?: RawBrawler[];
  };

  const data = (await res.json()) as RawPlayer;
  const brawlers = (data.brawlers ?? []).map((b) => ({
    id: b.id,
    name: b.name, // already UPPERCASE — matches our cube name format
    power: b.power,
  }));

  return NextResponse.json({
    name: data.name,
    tag: data.tag,
    brawlers,
    ownedLevel11: brawlers.filter((b) => b.power >= 11).map((b) => b.name),
  });
}
