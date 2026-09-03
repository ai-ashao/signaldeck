import { createHash } from "node:crypto";
import type { RawItem } from "@/lib/db/types";
import { assertSafeUrlSyntax, safeFetch, stripHtml } from "./helpers";

function meta(html: string, key: string) {
  const safe = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const a = new RegExp(`<meta[^>]+(?:property|name)=["']${safe}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i").exec(html);
  const b = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${safe}["'][^>]*>`, "i").exec(html);
  return a?.[1] || b?.[1] || "";
}

export async function manualUrlItem(url: string, fallbackTitle?: string, fallbackSummary?: string): Promise<RawItem> {
  assertSafeUrlSyntax(url);
  let title = fallbackTitle || "";
  let summary = fallbackSummary || "";
  try {
    const res = await safeFetch(url, { headers: { accept: "text/html,application/xhtml+xml" } }, 9000);
    const html = await res.text();
    title ||= meta(html,"og:title") || stripHtml(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || "");
    summary ||= meta(html,"og:description") || meta(html,"description");
  } catch {
    if (!title) throw new Error("无法读取该 URL，请补充 Title 后重试。");
  }
  if (!title) throw new Error("没有读取到标题，请手动填写 Title。");
  return {
    id: `manual:${createHash("sha1").update(url).digest("hex")}`,
    source: "manual", sourceName: "Manual URL", sourceItemId: url,
    title, summary, url, originalUrl: url, fetchedAt: new Date().toISOString(), metrics: {}, tags: [], rawData: {}
  };
}
