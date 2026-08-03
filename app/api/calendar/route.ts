// ============================================================
//  /api/calendar — upcoming US economic data-release schedule
//  Source: FRED /releases/dates (free with FRED_API_KEY).
//  Real release names + dates; no forecast/consensus values
//  (those are a paid-vendor feature), so the panel labels this
//  as a release schedule rather than a full econ calendar.
// ============================================================

import { NextResponse } from "next/server";
import { isFredEnabled, fredReleaseDates } from "@/lib/fred";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (!isFredEnabled()) {
    return NextResponse.json({
      data: [],
      error: "Economic calendar requires FRED_API_KEY.",
      source: "none",
      ts: Date.now(),
    });
  }

  try {
    const events = await fredReleaseDates();
    return NextResponse.json({
      data: events,
      error: events.length === 0 ? "No upcoming releases found." : null,
      source: "fred",
      ts: Date.now(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "calendar fetch failed";
    return NextResponse.json({ data: [], error: msg, source: "fred", ts: Date.now() }, { status: 502 });
  }
}
