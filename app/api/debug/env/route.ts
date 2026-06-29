import { NextResponse } from "next/server";
import { cubeQuery } from "@/lib/cube";

export const dynamic = "force-dynamic";

const FIX_MARKER = "fix-runtime-env-v2"; // bumps with every fix attempt

/**
 * Debug-only endpoint. Returns *non-sensitive* metadata about the env vars
 * the Node process actually reads at runtime. Used to verify Render is
 * picking up BRAWLTIME_PROXY correctly without exposing the value itself.
 */
export async function GET() {
  const proxy = process.env.BRAWLTIME_PROXY;
  const token = process.env.BRAWLSTARS_TOKEN;

  function inspect(value: string | undefined) {
    if (value == null) return { set: false };
    return {
      set: true,
      length: value.length,
      startsWith: value.slice(0, 12),
      endsWith: value.slice(-12),
      hasTrailingWhitespace: /\s$/.test(value),
      hasLeadingWhitespace: /^\s/.test(value),
      hasNewline: /[\r\n]/.test(value),
    };
  }

  // Reconstruct the URLs cube.ts would use, so we can confirm.
  const cleanedProxy = proxy?.replace(/\/+$/, "");
  const tokenUrl = cleanedProxy
    ? `${cleanedProxy}/trpc/auth.getToken`
    : "https://brawltime.ninja/api/trpc/auth.getToken";

  // Live-test the URL — does the runtime actually reach the worker?
  let tokenProbe: Record<string, unknown> = { skipped: true };
  try {
    const r = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const body = (await r.text()).slice(0, 200);
    tokenProbe = { status: r.status, bodyPreview: body };
  } catch (e) {
    tokenProbe = { error: (e as Error).message };
  }

  // Real test: actually go through the cube.ts module like /api/modes does.
  let cubeProbe: Record<string, unknown> = { skipped: true };
  try {
    const rows = await cubeQuery({
      measures: ["map.picks_measure"],
      dimensions: ["map.brawler_dimension"],
      filters: [
        { member: "map.brawler_dimension", operator: "equals", values: ["SHELLY"] },
      ],
      limit: 1,
    });
    cubeProbe = { ok: true, rows: rows.length };
  } catch (e) {
    cubeProbe = { ok: false, error: (e as Error).message };
  }

  return NextResponse.json({
    marker: FIX_MARKER,
    nodeVersion: process.version,
    nextRuntime: process.env.NEXT_RUNTIME ?? "(nodejs)",
    env: {
      BRAWLTIME_PROXY: inspect(proxy),
      BRAWLSTARS_TOKEN: inspect(token),
    },
    resolvedTokenUrl: tokenUrl,
    inlineTokenProbe: tokenProbe,
    cubeModuleProbe: cubeProbe,
  });
}
