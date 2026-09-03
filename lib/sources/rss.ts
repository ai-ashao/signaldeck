import { XMLParser } from "fast-xml-parser";
import { createHash } from "node:crypto";
import type { RawItem } from "@/lib/db/types";
import type { SourceAdapter } from "./types";
import { ensureArray, safeFetch, stripHtml } from "./helpers";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
function text(v: any): string {
  if (typeof v === "string" || typeof v === "number") return String(v);
  return v?.["#text"] || v?.["@_href"] || "";
}
function linkOf(x: any) {
  if (typeof x.link === "string") return x.link;
  const links = ensureArray(x.link);
  const alt = links.find((l:any) => l?.["@_rel"] === "alternate") || links[0];
  return text(alt) || text(x.guid) || "";
}

function isoDate(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export const rssAdapter: SourceAdapter = {
  id: "rss",
  async fetch(config) {
    const feedUrl = String(config.config.feedUrl || "");
    if (!feedUrl) return [];
    const xml = await (await safeFetch(feedUrl)).text();
    const data = parser.parse(xml);
    const rssItems = ensureArray(data?.rss?.channel?.item);
    const atomItems = ensureArray(data?.feed?.entry);
    const items = [...rssItems, ...atomItems].slice(0, 80);
    return items.flatMap((x:any): RawItem[] => {
      const title = stripHtml(text(x.title));
      const url = linkOf(x);
      if (!title || !url) return [];
      const idSeed = text(x.guid) || text(x.id) || url;
      const desc = text(x.description) || text(x.summary) || text(x.content) || text(x["content:encoded"]);
      const date = text(x.pubDate) || text(x.published) || text(x.updated);
      return [{
        id: `${config.id}:${createHash("sha1").update(idSeed).digest("hex")}`,
        source: config.source_type === "producthunt" ? "producthunt" : "rss",
        sourceName: config.name,
        sourceItemId: idSeed,
        title,
        summary: stripHtml(desc).slice(0, 2000),
        url,
        originalUrl: url,
        author: text(x.author?.name || x.author) || undefined,
        publishedAt: isoDate(date),
        fetchedAt: new Date().toISOString(),
        metrics: {}, tags: [], rawData: x,
      }];
    });
  }
};
