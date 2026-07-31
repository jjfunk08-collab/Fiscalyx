import { NextResponse } from "next/server";
import { makeNews } from "@/lib/mock";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // A real provider (Finnhub /news, Google News RSS, NewsAPI) would be
  // attempted here when configured; failures fall through to mock.
  const news = makeNews(45);
  return NextResponse.json({ data: news, source: "mock", ts: Date.now() });
}
