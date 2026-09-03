import type { SourceAdapter, SourceConfig } from "./types";
import { aihotAdapter } from "./aihot";
import { hackerNewsAdapter } from "./hackernews";
import { productHuntAdapter } from "./producthunt";
import { rssAdapter } from "./rss";

const adapters: Record<string, SourceAdapter> = {
  aihot: aihotAdapter,
  hackernews: hackerNewsAdapter,
  producthunt: productHuntAdapter,
  rss: rssAdapter,
};

export async function fetchSource(config: SourceConfig) {
  const adapter = adapters[config.source_type];
  if (!adapter) throw new Error(`No adapter for ${config.source_type}`);
  return adapter.fetch(config);
}
