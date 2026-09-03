import type { SourceAdapter } from "./types";
import { rssAdapter } from "./rss";
export const productHuntAdapter: SourceAdapter = {
  id: "producthunt",
  async fetch(config) { return rssAdapter.fetch(config); }
};
