import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  all: vi.fn(),
  getEvent: vi.fn(),
  setRuleScore: vi.fn(),
  upsertScore: vi.fn(),
  ruleScore: vi.fn(),
  heuristicScore: vi.fn(),
  ollamaScore: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { prepare: () => ({ all: mocks.all }) } }));
vi.mock("@/lib/db/queries", () => ({
  getEvent: mocks.getEvent,
  setRuleScore: mocks.setRuleScore,
  upsertScore: mocks.upsertScore,
}));
vi.mock("../lib/scoring/rules", () => ({ ruleScore: mocks.ruleScore }));
vi.mock("../lib/scoring/heuristic", () => ({ heuristicScore: mocks.heuristicScore }));
vi.mock("../lib/scoring/ollama", () => ({ ollamaScore: mocks.ollamaScore }));

import { scoreRecentEvents } from "../lib/scoring/index";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("scoreRecentEvents", () => {
  it("skips missing events and events below the rule threshold", async () => {
    const low = { id: "low", sources: [] };
    mocks.all.mockReturnValue([{ id: "missing" }, { id: "low" }]);
    mocks.getEvent.mockReturnValueOnce(null).mockReturnValueOnce(low);
    mocks.ruleScore.mockReturnValue(-11);

    await expect(scoreRecentEvents(2)).resolves.toEqual({ scored: 0 });
    expect(mocks.setRuleScore).toHaveBeenCalledWith("low", -11);
    expect(mocks.heuristicScore).not.toHaveBeenCalled();
    expect(mocks.upsertScore).not.toHaveBeenCalled();
  });

  it("runs heuristic and optional model scoring before upserting a result", async () => {
    const event = { id: "ok", sources: [{ source_name: "Test" }] };
    const heuristic = { model: "heuristic" };
    const final = { model: "ollama" };
    mocks.all.mockReturnValue([{ id: "ok" }]);
    mocks.getEvent.mockReturnValue(event);
    mocks.ruleScore.mockReturnValue(20);
    mocks.heuristicScore.mockReturnValue(heuristic);
    mocks.ollamaScore.mockResolvedValue(final);

    await expect(scoreRecentEvents()).resolves.toEqual({ scored: 1 });
    expect(mocks.heuristicScore).toHaveBeenCalledWith(event, event.sources, 20);
    expect(mocks.ollamaScore).toHaveBeenCalledWith(event, event.sources, heuristic);
    expect(mocks.upsertScore).toHaveBeenCalledWith("ok", final);
  });
});
