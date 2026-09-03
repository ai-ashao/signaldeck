import { createHash } from "node:crypto";
import type { RawItem } from "@/lib/db/types";
import type { SourceAdapter } from "./types";
import { safeFetch } from "./helpers";

function pickItems(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  for (const key of ["items","data","results"]) if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
}

export const aihotAdapter: SourceAdapter = {
  id: "aihot",
  async fetch() {
    const endpoints = [
      "https://aihot.virxact.com/api/v1/items?mode=selected&window=24h&limit=100",
      "https://aihot.virxact.com/api/v1/hot-topics",
    ];
    const out: RawItem[] = [];
    for (const endpoint of endpoints) {
      try {
        const payload = await (await safeFetch(endpoint)).json();
        const items = pickItems(payload);
        for (const x of items) {
          const links = x.links || {};
          const url = links.aihot || x.permalink || links.original || x.url;
          const originalUrl = links.original || x.url || url;
          const title = x.title || x.name || x.canonicalTitle;
          if (!title || !url) continue;
          const sourceName = x.source?.name || x.sourceName || x.source || "AIHOT";
          const idSeed = String(x.publicId || x.id || x.guid || url);
          out.push({
            id: `aihot:${createHash("sha1").update(idSeed).digest("hex")}`,
            source: "aihot",
            sourceName: String(sourceName),
            sourceItemId: idSeed,
            title: String(title),
            summary: x.summary || x.recommendationReason || x.description || "",
            url: String(url),
            originalUrl: String(originalUrl),
            author: x.author || undefined,
            publishedAt: x.publishedAt || x.timelineAt || x.createdAt || undefined,
            fetchedAt: new Date().toISOString(),
            metrics: { views: x.views, likes: x.likes, comments: x.comments },
            tags: [x.category, ...(Array.isArray(x.tags) ? x.tags : [])].filter(Boolean),
            rawData: x,
          });
        }
      } catch (err) {
        console.warn("AIHOT fetch failed", endpoint, err);
      }
    }
    return out;
  }
};
