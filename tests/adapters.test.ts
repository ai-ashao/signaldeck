import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ safeFetch: vi.fn() }));

vi.mock("../lib/sources/helpers", async () => {
  const actual = await vi.importActual<typeof import("../lib/sources/helpers")>(
    "../lib/sources/helpers",
  );
  return { ...actual, safeFetch: mocks.safeFetch };
});

import { aihotAdapter } from "../lib/sources/aihot";
import { hackerNewsAdapter } from "../lib/sources/hackernews";

const jsonResponse = (value: unknown) => ({ json: vi.fn().mockResolvedValue(value) });

beforeEach(() => {
  mocks.safeFetch.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AIHOT adapter", () => {
  it("maps supported payload fields and filters entries without a title or URL", async () => {
    mocks.safeFetch
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              publicId: "public-1",
              title: "Agent launch",
              links: { aihot: "https://aihot.test/1", original: "https://origin.test/1" },
              source: { name: "Official" },
              recommendationReason: "Worth watching",
              category: "agents",
              tags: ["demo"],
              views: 100,
            },
            { id: "missing-url", title: "No URL" },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ results: [] }));

    const items = await aihotAdapter.fetch({} as any);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      sourceItemId: "public-1",
      title: "Agent launch",
      sourceName: "Official",
      url: "https://aihot.test/1",
      originalUrl: "https://origin.test/1",
      summary: "Worth watching",
      metrics: { views: 100 },
      tags: ["agents", "demo"],
    });
  });

  it("continues with the next endpoint when one AIHOT endpoint fails", async () => {
    mocks.safeFetch
      .mockRejectedValueOnce(new Error("first endpoint unavailable"))
      .mockResolvedValueOnce(
        jsonResponse({ data: { items: [{ id: "two", name: "Second", url: "https://x.test/2" }] } }),
      );

    const items = await aihotAdapter.fetch({} as any);

    expect(items.map((item) => item.title)).toEqual(["Second"]);
    expect(console.warn).toHaveBeenCalledWith(
      "AIHOT fetch failed",
      expect.any(String),
      expect.any(Error),
    );
  });
});

describe("Hacker News adapter", () => {
  it("accepts qualifying regular and Show HN stories and deduplicates ids", async () => {
    mocks.safeFetch.mockImplementation(async (url: string) => {
      if (url.includes("topstories")) return jsonResponse([1, 2]);
      if (url.includes("beststories")) return jsonResponse([1]);
      if (url.includes("showstories")) return jsonResponse([3]);
      if (url.endsWith("/1.json"))
        return jsonResponse({ id: 1, type: "story", title: "Regular", score: 30, descendants: 2, text: "<b>body</b>" });
      if (url.endsWith("/2.json"))
        return jsonResponse({ id: 2, type: "story", title: "Comments", score: 2, descendants: 12 });
      return jsonResponse({ id: 3, type: "story", title: "Show HN: Demo", score: 10, descendants: 0 });
    });

    const items = await hackerNewsAdapter.fetch({} as any);

    expect(items.map((item) => item.id)).toEqual(["hn:1", "hn:2", "hn:3"]);
    expect(items[0].summary).toBe("body");
    expect(items[2].tags).toEqual(["show-hn"]);
  });

  it("skips rejected item requests, deleted records, non-stories, and low scores", async () => {
    mocks.safeFetch.mockImplementation(async (url: string) => {
      if (url.includes("stories")) return jsonResponse([10, 11, 12, 13]);
      if (url.endsWith("/10.json")) throw new Error("item unavailable");
      if (url.endsWith("/11.json")) return jsonResponse({ id: 11, deleted: true, type: "story" });
      if (url.endsWith("/12.json")) return jsonResponse({ id: 12, type: "comment", title: "Not story" });
      return jsonResponse({ id: 13, type: "story", title: "Too quiet", score: 1, descendants: 1 });
    });

    await expect(hackerNewsAdapter.fetch({} as any)).resolves.toEqual([]);
  });

  it("continues after a story-list endpoint fails", async () => {
    mocks.safeFetch.mockImplementation(async (url: string) => {
      if (url.includes("topstories")) throw new Error("list unavailable");
      if (url.includes("beststories")) return jsonResponse([20]);
      if (url.includes("showstories")) return jsonResponse([]);
      return jsonResponse({ id: 20, type: "story", title: "Recovered", score: 50, descendants: 1 });
    });

    const items = await hackerNewsAdapter.fetch({} as any);

    expect(items.map((item) => item.title)).toEqual(["Recovered"]);
    expect(console.warn).toHaveBeenCalledWith(
      "HN list failed",
      "topstories",
      expect.any(Error),
    );
  });
});
