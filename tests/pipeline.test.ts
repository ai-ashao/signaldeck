import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listSourceConfigs: vi.fn(),
  insertRawItem: vi.fn(),
  markSourceFetched: vi.fn(),
  fetchSource: vi.fn(),
  dedupPendingRawItems: vi.fn(),
  scoreRecentEvents: vi.fn(),
}));

vi.mock("@/lib/db/queries", () => ({
  listSourceConfigs: mocks.listSourceConfigs,
  insertRawItem: mocks.insertRawItem,
  markSourceFetched: mocks.markSourceFetched,
}));
vi.mock("@/lib/sources", () => ({ fetchSource: mocks.fetchSource }));
vi.mock("@/lib/dedup", () => ({ dedupPendingRawItems: mocks.dedupPendingRawItems }));
vi.mock("@/lib/scoring", () => ({ scoreRecentEvents: mocks.scoreRecentEvents }));

import { refreshAll } from "../lib/pipeline";

const source = (id: string, name: string, enabled = true) => ({ id, name, enabled });
const item = (id: string) => ({ id });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listSourceConfigs.mockReturnValue([source("one", "One")]);
  mocks.insertRawItem.mockReturnValue(true);
  mocks.dedupPendingRawItems.mockReturnValue({ created: 1, merged: 0, processed: 1 });
  mocks.scoreRecentEvents.mockResolvedValue({ scored: 1 });
});

describe("refresh pipeline", () => {
  it("shares one in-flight refresh across concurrent callers", async () => {
    let release!: (items: any[]) => void;
    mocks.fetchSource.mockReturnValue(new Promise((resolve) => (release = resolve)));

    const first = refreshAll();
    const second = refreshAll();
    expect(second).toBe(first);
    expect(mocks.fetchSource).toHaveBeenCalledTimes(1);

    release([item("raw-1")]);
    await expect(first).resolves.toMatchObject({ scoring: { scored: 1 } });
  });

  it("records a failed source and continues processing later sources", async () => {
    mocks.listSourceConfigs.mockReturnValue([
      source("bad", "Bad"),
      source("off", "Off", false),
      source("good", "Good"),
    ]);
    mocks.fetchSource
      .mockRejectedValueOnce(new Error("feed failed"))
      .mockResolvedValueOnce([item("new"), item("duplicate")]);
    mocks.insertRawItem.mockReturnValueOnce(true).mockReturnValueOnce(false);

    const result = await refreshAll();

    expect(result.sources).toEqual([
      { source: "Bad", ok: false, error: "feed failed" },
      { source: "Good", ok: true, fetched: 2, inserted: 1 },
    ]);
    expect(mocks.markSourceFetched).toHaveBeenCalledWith("good");
    expect(mocks.markSourceFetched).not.toHaveBeenCalledWith("bad");
    expect(mocks.dedupPendingRawItems).toHaveBeenCalledOnce();
  });

  it("releases the concurrency lock after a rejected refresh", async () => {
    mocks.fetchSource.mockResolvedValue([item("raw-1")]);
    mocks.scoreRecentEvents
      .mockRejectedValueOnce(new Error("scoring crashed"))
      .mockResolvedValueOnce({ scored: 1 });

    await expect(refreshAll()).rejects.toThrow("scoring crashed");
    await expect(refreshAll()).resolves.toMatchObject({ scoring: { scored: 1 } });
    expect(mocks.fetchSource).toHaveBeenCalledTimes(2);
  });
});
