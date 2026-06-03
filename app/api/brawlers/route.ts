import { NextResponse } from "next/server";
import { getBrawlers } from "@/lib/brawlify";
import { warmGlobal } from "@/lib/matchups";
import { getBaselineWRs } from "@/lib/baseline";
import { BUCKETS, bucketTrophyMin } from "@/lib/buckets";

export const dynamic = "force-dynamic";

export async function GET() {
  const brawlers = await getBrawlers();
  // Fire-and-forget pre-warm for every ELO bucket so switching is fast.
  for (const b of BUCKETS) {
    const trophyMin = bucketTrophyMin(b);
    warmGlobal(trophyMin);
    void getBaselineWRs(trophyMin).catch(() => {});
  }
  return NextResponse.json({ brawlers });
}
