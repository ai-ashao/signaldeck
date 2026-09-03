import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ollamaScore } from "../lib/scoring/ollama";
import type { ScoreResult } from "../lib/db/types";

const fallback: ScoreResult = {
  freshness: 1,
  wow: 1,
  visual: 1,
  utility: 1,
  hook: 1,
  trend: 1,
  audience: 1,
  commercial: 1,
  short_video_fit: 10,
  long_video_fit: 10,
  wechat_fit: 10,
  overall_score: 10,
  why: "fallback",
  best_angle: "fallback",
  hook_text: "fallback",
  risk: "fallback",
  model: "heuristic-v1",
  prompt_version: "zero-key-v1",
};

const modelResult = {
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
  why: "model reason",
  best_angle: "model angle",
  hook_text: "model hook",
  risk: "model risk",
};

beforeEach(() => {
  delete process.env.OLLAMA_MODEL;
  delete process.env.OLLAMA_BASE_URL;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ollamaScore", () => {
  it("returns the heuristic result without a network call when no model is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(ollamaScore({ canonical_title: "Title" }, [], fallback)).resolves.toBe(fallback);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a valid local model response and records model provenance", async () => {
    process.env.OLLAMA_MODEL = "qwen-test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: { content: JSON.stringify(modelResult) } })),
      ),
    );

    const result = await ollamaScore(
      { canonical_title: "Title", summary: "Summary", source_count: 2 },
      [{ source_name: "Official" }],
      fallback,
    );

    expect(result).toMatchObject({
      overall_score: 81,
      model: "ollama:qwen-test",
      prompt_version: "content-score-v1",
    });
  });

  it("falls back when the model server returns an HTTP error", async () => {
    process.env.OLLAMA_MODEL = "qwen-test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no", { status: 500 })));

    await expect(ollamaScore({ canonical_title: "Title" }, [], fallback)).resolves.toBe(fallback);
  });

  it("falls back for malformed JSON and schema-invalid model output", async () => {
    process.env.OLLAMA_MODEL = "qwen-test";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: { content: "not-json" } })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: { content: JSON.stringify({ overall_score: 99 }) } })),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(ollamaScore({ canonical_title: "Title" }, [], fallback)).resolves.toBe(fallback);
    await expect(ollamaScore({ canonical_title: "Title" }, [], fallback)).resolves.toBe(fallback);
  });

  it("falls back when the model request rejects or times out", async () => {
    process.env.OLLAMA_MODEL = "qwen-test";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")));

    await expect(ollamaScore({ canonical_title: "Title" }, [], fallback)).resolves.toBe(fallback);
  });
});
