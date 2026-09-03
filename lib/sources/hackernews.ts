import type { RawItem } from "@/lib/db/types";
import type { SourceAdapter } from "./types";
import { safeFetch, stripHtml } from "./helpers";

const BASE = "https://hacker-news.firebaseio.com/v0";
async function ids(kind: string) { return await (await safeFetch(`${BASE}/${kind}.json`)).json() as number[]; }
async function item(id: number) { return await (await safeFetch(`${BASE}/item/${id}.json`)).json() as any; }

export const hackerNewsAdapter: SourceAdapter = {
  id: "hackernews",
  async fetch() {
    const groups: Array<[string, number]> = [["topstories", 35],["beststories",25],["showstories",40]];
    const seen = new Set<number>();
    const out: RawItem[] = [];
    for (const [kind, limit] of groups) {
      let list: number[] = [];
      try { list = (await ids(kind)).slice(0, limit); } catch (e) { console.warn("HN list failed", kind, e); continue; }
      const batch = await Promise.allSettled(list.map(item));
      for (const result of batch) {
        if (result.status !== "fulfilled") continue;
        const x = result.value;
        if (!x || seen.has(x.id) || x.deleted || x.dead || x.type !== "story") continue;
        const isShow = String(x.title || "").startsWith("Show HN:");
        if (!isShow && (Number(x.score || 0) < 30 && Number(x.descendants || 0) < 10)) continue;
        if (isShow && Number(x.score || 0) < 10) continue;
        seen.add(x.id);
        const discussion = `https://news.ycombinator.com/item?id=${x.id}`;
        out.push({
          id: `hn:${x.id}`,
          source: "hackernews",
          sourceName: "Hacker News",
          sourceItemId: String(x.id),
          title: x.title,
          summary: stripHtml(x.text || ""),
          url: discussion,
          originalUrl: x.url || discussion,
          author: x.by,
          publishedAt: x.time ? new Date(x.time * 1000).toISOString() : undefined,
          fetchedAt: new Date().toISOString(),
          metrics: { upvotes: Number(x.score || 0), comments: Number(x.descendants || 0) },
          tags: isShow ? ["show-hn"] : [],
          rawData: x,
        });
      }
    }
    return out;
  }
};
