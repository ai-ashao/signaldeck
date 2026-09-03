import { afterEach, describe, expect, it, vi } from "vitest";

const dns = vi.hoisted(() => ({ lookup: vi.fn() }));

vi.mock("node:dns/promises", () => ({ lookup: dns.lookup }));

import { safeFetch } from "../lib/sources/helpers";
import { manualUrlItem } from "../lib/sources/manual";
import { rssAdapter } from "../lib/sources/rss";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

dns.lookup.mockResolvedValue([{ address: "203.0.113.10", family: 4 }]);

describe("safeFetch", () => {
  it("follows a public redirect, merges headers, and blocks a private redirect", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://cdn.example.test/final" },
        }),
      )
      .mockResolvedValueOnce(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);

    const response = await safeFetch("https://example.test/start", {
      headers: { accept: "text/plain", "x-test": "yes" },
    });

    expect(await response.text()).toBe("ok");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ href: "https://cdn.example.test/final" }),
      expect.objectContaining({
        cache: "no-store",
        redirect: "manual",
        headers: expect.objectContaining({
          accept: "text/plain",
          "user-agent": expect.stringContaining("SignalDeck"),
          "x-test": "yes",
        }),
      }),
    );

    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } }),
    );
    await expect(safeFetch("https://example.test/start")).rejects.toThrow(
      "Private network URLs are not supported",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects non-success HTTP responses with status and URL context", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("no", { status: 503, statusText: "Unavailable" })),
    );

    await expect(safeFetch("https://example.test/feed")).rejects.toThrow(
      "503 Unavailable for https://example.test/feed",
    );
  });

  it("aborts a request after its timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          if (init.signal?.aborted) reject(new DOMException("aborted", "AbortError"));
          else
            init.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
        }),
      ),
    );

    const request = safeFetch("https://example.test/slow", {}, 25);
    const rejection = expect(request).rejects.toMatchObject({ name: "AbortError" });
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(26);
    await rejection;
  });
});

describe("RSS and Atom ingestion", () => {
  it("parses RSS items and strips unsafe or decorative HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(`<?xml version="1.0"?><rss><channel><item>
          <guid>post-1</guid><title><![CDATA[<b>AI Launch</b>]]></title>
          <link>https://example.test/post-1</link>
          <description><![CDATA[Hello <script>bad()</script><b>world</b> &amp; friends]]></description>
          <pubDate>Wed, 03 Sep 2026 08:00:00 GMT</pubDate>
        </item></channel></rss>`),
      ),
    );

    const items = await rssAdapter.fetch({
      id: "rss-test",
      source_type: "rss",
      name: "Test Feed",
      enabled: true,
      config: { feedUrl: "https://example.test/rss.xml" },
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      source: "rss",
      sourceName: "Test Feed",
      title: "AI Launch",
      url: "https://example.test/post-1",
      summary: "Hello world & friends",
    });
  });

  it("parses Atom alternate links and returns no items when feed URL is absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(`<?xml version="1.0"?><feed>
          <entry><id>atom-1</id><title>Atom Story</title>
          <link rel="alternate" href="https://example.test/atom-1"/>
          <summary>Useful update</summary><author><name>Ada</name></author>
          <updated>2026-09-03T08:00:00Z</updated></entry>
        </feed>`),
      ),
    );
    const config = {
      id: "producthunt",
      source_type: "producthunt",
      name: "Product Hunt",
      enabled: true,
      config: { feedUrl: "https://example.test/atom.xml" },
    };

    const items = await rssAdapter.fetch(config);
    expect(items[0]).toMatchObject({
      source: "producthunt",
      title: "Atom Story",
      url: "https://example.test/atom-1",
      author: "Ada",
    });
    await expect(rssAdapter.fetch({ ...config, config: {} })).resolves.toEqual([]);
  });
});

describe("manual URL ingestion", () => {
  it("extracts Open Graph metadata regardless of attribute order", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(`<html><head>
          <meta content="A useful summary" property="og:description">
          <meta property="og:title" content="A useful title">
        </head></html>`),
      ),
    );

    const item = await manualUrlItem("https://example.test/article");
    expect(item).toMatchObject({
      source: "manual",
      title: "A useful title",
      summary: "A useful summary",
      originalUrl: "https://example.test/article",
    });
  });

  it("uses caller-provided metadata when the page cannot be fetched", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const item = await manualUrlItem(
      "https://example.test/offline",
      "Fallback title",
      "Fallback summary",
    );

    expect(item.title).toBe("Fallback title");
    expect(item.summary).toBe("Fallback summary");
  });

  it("rejects an unreadable page when no fallback title was supplied", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(manualUrlItem("https://example.test/offline")).rejects.toThrow(
      "无法读取该 URL，请补充 Title 后重试。",
    );
  });
});
