import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  manualUrlItem: vi.fn(),
  insertRawItem: vi.fn(),
  dedupPendingRawItems: vi.fn(),
  scoreRecentEvents: vi.fn(),
  refreshAll: vi.fn(),
}));

vi.mock("@/lib/sources/manual", () => ({ manualUrlItem: mocks.manualUrlItem }));
vi.mock("@/lib/db/queries", () => ({ insertRawItem: mocks.insertRawItem }));
vi.mock("@/lib/dedup", () => ({ dedupPendingRawItems: mocks.dedupPendingRawItems }));
vi.mock("@/lib/scoring", () => ({ scoreRecentEvents: mocks.scoreRecentEvents }));
vi.mock("@/lib/pipeline", () => ({ refreshAll: mocks.refreshAll }));

import { GET as cronFetch } from "../app/api/cron/fetch/route";
import { POST as addManualUrl } from "../app/api/manual-url/route";
import { POST as refresh } from "../app/api/refresh/route";

function formRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new NextRequest("http://localhost/api/manual-url", { method: "POST", body: form });
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
  mocks.manualUrlItem.mockResolvedValue({ id: "manual-1" });
  mocks.scoreRecentEvents.mockResolvedValue({ scored: 1 });
  mocks.refreshAll.mockResolvedValue({ sources: [] });
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("manual URL API", () => {
  it("rejects an empty URL before invoking ingestion", async () => {
    const response = await addManualUrl(formRequest({ url: "   " }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "URL required" });
    expect(mocks.manualUrlItem).not.toHaveBeenCalled();
  });

  it("returns a recoverable 400 response when ingestion fails", async () => {
    mocks.manualUrlItem.mockRejectedValue(new Error("blocked URL"));

    const response = await addManualUrl(formRequest({ url: "https://example.test" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "blocked URL" });
  });

  it("runs insert, dedup, and scoring for a valid manual URL", async () => {
    const response = await addManualUrl(
      formRequest({ url: " https://example.test ", title: " Title ", summary: " Summary " }),
    );

    expect(response.status).toBe(200);
    expect(mocks.manualUrlItem).toHaveBeenCalledWith(
      "https://example.test",
      "Title",
      "Summary",
    );
    expect(mocks.insertRawItem).toHaveBeenCalledWith({ id: "manual-1" });
    expect(mocks.dedupPendingRawItems).toHaveBeenCalledOnce();
    expect(mocks.scoreRecentEvents).toHaveBeenCalledWith(30);
  });
});

describe("refresh APIs", () => {
  it("returns refresh results and converts pipeline failures to a 500 response", async () => {
    const success = await refresh();
    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toEqual({ sources: [] });

    mocks.refreshAll.mockRejectedValueOnce(new Error("refresh failed"));
    const failure = await refresh();
    expect(failure.status).toBe(500);
    await expect(failure.json()).resolves.toEqual({ error: "refresh failed" });
  });

  it("enforces the cron secret and reports both success and pipeline failure", async () => {
    process.env.CRON_SECRET = "secret";
    const unauthorized = await cronFetch(new NextRequest("http://localhost/api/cron/fetch"));
    expect(unauthorized.status).toBe(401);
    expect(mocks.refreshAll).not.toHaveBeenCalled();

    const authorizedRequest = () =>
      new NextRequest("http://localhost/api/cron/fetch", {
        headers: { authorization: "Bearer secret" },
      });
    const success = await cronFetch(authorizedRequest());
    expect(success.status).toBe(200);

    mocks.refreshAll.mockRejectedValueOnce(new Error("cron failed"));
    const failure = await cronFetch(authorizedRequest());
    expect(failure.status).toBe(500);
    await expect(failure.json()).resolves.toEqual({ error: "cron failed" });
  });
});
