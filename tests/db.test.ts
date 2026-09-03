import { randomUUID } from "node:crypto";
import fs from "node:fs";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { vi } from "vitest";

vi.mock("@/lib/normalize/title", async () => await import("../lib/normalize/title"));
vi.mock("@/lib/normalize/url", async () => await import("../lib/normalize/url"));
vi.mock("@/lib/db", async () => await import("../lib/db/index"));
vi.mock("@/lib/db/queries", async () => await import("../lib/db/queries"));

const dbPath = `/tmp/signaldeck-vitest-${process.pid}-${randomUUID()}.db`;
process.env.DATABASE_PATH = dbPath;

let dbModule: typeof import("../lib/db/index");
let queries: typeof import("../lib/db/queries");
let dedup: typeof import("../lib/dedup/index");

function raw(id: string, title: string, url: string) {
  return {
    id,
    source: "manual" as const,
    sourceName: "Test",
    sourceItemId: id,
    title,
    url,
    originalUrl: url,
    fetchedAt: "2026-09-03T08:00:00.000Z",
  };
}

beforeAll(async () => {
  dbModule = await import("../lib/db/index");
  queries = await import("../lib/db/queries");
  dedup = await import("../lib/dedup/index");
});

afterAll(() => {
  dbModule.db.close();
  for (const suffix of ["", "-shm", "-wal"]) {
    try {
      fs.unlinkSync(`${dbPath}${suffix}`);
    } catch {}
  }
});

describe("SQLite persistence", () => {
  it("creates the schema and seeds the four default sources idempotently", () => {
    expect(queries.listSourceConfigs().map((source) => source.id)).toEqual([
      "aihot",
      "hn",
      "producthunt",
      "rss-openai",
    ]);

    dbModule.initDb();
    expect(queries.listSourceConfigs()).toHaveLength(4);
  });

  it("normalizes inserted items and ignores a duplicate source item", () => {
    const item = raw(
      "raw-1",
      "Introducing: AI Agent 🚀",
      "https://EXAMPLE.test/demo/?utm_source=test#top",
    );

    expect(queries.insertRawItem(item)).toBe(true);
    expect(queries.insertRawItem(item)).toBe(false);
    const stored = queries.getUnassignedRawItems().find((row) => row.id === "raw-1");
    expect(stored).toMatchObject({
      normalized_title: "introducing ai agent",
      normalized_url: "https://example.test/demo",
    });
  });

  it("creates, exact-merges, and title-merges deduplicated events", () => {
    expect(dedup.dedupPendingRawItems()).toMatchObject({ created: 1, merged: 0 });

    queries.insertRawItem(
      raw("raw-2", "Different headline", "https://example.test/demo?utm_campaign=again"),
    );
    expect(dedup.dedupPendingRawItems()).toMatchObject({ created: 0, merged: 1 });

    queries.insertRawItem(
      raw("raw-3", "Introducing AI Agent launch", "https://other.test/launch"),
    );
    expect(dedup.dedupPendingRawItems()).toMatchObject({ created: 0, merged: 1 });

    const event = queries.getEvents("all")[0];
    expect(event.source_count).toBe(1);
    expect(queries.getEvent(event.event_id)?.sources).toHaveLength(3);
  });

  it("persists actions, scores, content jobs, tab filters, and stats", () => {
    const eventId = queries.getEvents("all")[0].event_id as string;
    queries.setEventAction(eventId, "save");
    expect(queries.getEvents("saved").map((event) => event.event_id)).toContain(eventId);

    queries.setEventAction(eventId, "ignore");
    expect(queries.getEvents("ignored").map((event) => event.event_id)).toContain(eventId);
    queries.setEventAction(eventId, "restore");
    queries.setEventAction(eventId, "unsave");

    const score = {
      freshness: 8,
      wow: 7,
      visual: 6,
      utility: 9,
      hook: 7,
      trend: 6,
      audience: 8,
      commercial: 5,
      short_video_fit: 80,
      long_video_fit: 75,
      wechat_fit: 85,
      overall_score: 81,
      why: "test",
      best_angle: "angle",
      hook_text: "hook",
      risk: "risk",
      model: "test-model",
      prompt_version: "test-v1",
    };
    queries.upsertScore(eventId, score);
    expect(queries.getEvents("short")[0]).toMatchObject({ event_id: eventId, overall_score: 81 });

    const jobId = queries.createContentJob(eventId, "wechat", { outline: ["one"] });
    expect(queries.getContentJob(jobId)).toMatchObject({
      event_id: eventId,
      content_type: "wechat",
      brief: { outline: ["one"] },
    });
    expect(queries.getStats().selected).toBe(1);
  });
});
