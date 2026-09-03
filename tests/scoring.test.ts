import { afterEach, describe, expect, it, vi } from "vitest";

import { heuristicScore } from "../lib/scoring/heuristic";
import { ruleScore } from "../lib/scoring/rules";

const now = new Date("2026-09-03T08:00:00.000Z");

afterEach(() => {
  vi.useRealTimers();
});

describe("ruleScore", () => {
  it("rewards fresh, useful launches and source engagement", () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const score = ruleScore(
      {
        canonical_title: "Launch open-source MCP agent workflow tool",
        summary: "A free browser automation demo for developers",
        source_count: 2,
        last_seen_at: "2026-09-03T04:00:00.000Z",
      },
      [{ metrics: JSON.stringify({ upvotes: 120, comments: 55 }) }],
    );

    expect(score).toBeGreaterThanOrEqual(80);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("penalizes stale funding and paper coverage", () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const score = ruleScore(
      {
        canonical_title: "AI company raises funding at new valuation",
        summary: "Paper interview",
        source_count: 1,
        last_seen_at: "2026-08-20T00:00:00.000Z",
      },
      [{ metrics: "not-json" }],
    );

    expect(score).toBeLessThan(0);
  });
});

describe("heuristicScore", () => {
  it("returns bounded scores and a verification warning", () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const result = heuristicScore(
      {
        canonical_title: "Show HN: Open-source browser agent demo",
        summary: "A free coding workflow tool",
        source_count: 1,
        last_seen_at: "2026-09-03T02:00:00.000Z",
      },
      [],
      60,
    );

    for (const key of [
      "freshness",
      "wow",
      "visual",
      "utility",
      "hook",
      "trend",
      "audience",
      "commercial",
    ] as const) {
      expect(result[key]).toBeGreaterThanOrEqual(0);
      expect(result[key]).toBeLessThanOrEqual(10);
    }

    for (const key of ["short_video_fit", "long_video_fit", "wechat_fit", "overall_score"] as const) {
      expect(result[key]).toBeGreaterThanOrEqual(0);
      expect(result[key]).toBeLessThanOrEqual(100);
    }

    expect(result.model).toBe("heuristic-v1");
    expect(result.risk).toContain("来源较少");
    expect(result.best_angle).toContain("省了什么步骤");
  });
});
