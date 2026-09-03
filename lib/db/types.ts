export type SourceType = "aihot" | "hackernews" | "producthunt" | "rss" | "manual";
export type ContentType = "short_video" | "long_video" | "wechat";

export interface RawItem {
  id: string;
  source: SourceType;
  sourceName: string;
  sourceItemId?: string;
  title: string;
  summary?: string;
  url: string;
  originalUrl?: string;
  author?: string;
  publishedAt?: string;
  fetchedAt: string;
  metrics?: Record<string, number | undefined>;
  tags?: string[];
  rawData?: Record<string, unknown>;
}

export interface ScoreResult {
  freshness: number;
  wow: number;
  visual: number;
  utility: number;
  hook: number;
  trend: number;
  audience: number;
  commercial: number;
  short_video_fit: number;
  long_video_fit: number;
  wechat_fit: number;
  overall_score: number;
  why: string;
  best_angle: string;
  hook_text: string;
  risk: string;
  model: string;
  prompt_version: string;
}
