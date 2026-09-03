import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getEvent: vi.fn() }));

vi.mock("@/lib/db/queries", () => ({ getEvent: mocks.getEvent }));

import { buildBrief } from "../lib/content/generate";

const event = {
  canonical_title: "Example Agent",
  summary: "An agent that shortens a workflow",
  primary_url: "https://example.test/agent",
  hook_text: "Watch this agent finish the task",
  risk: "Verify the benchmark.",
  sources: [
    {
      source_name: "Official",
      title: "Launch post",
      url: "https://aggregator.test/item",
      original_url: "https://example.test/launch",
    },
  ],
};

beforeEach(() => {
  mocks.getEvent.mockReset();
  mocks.getEvent.mockReturnValue(event);
});

describe("buildBrief", () => {
  it("builds an evidence-backed short-video brief", () => {
    const brief = buildBrief("event-1", "short_video") as any;

    expect(brief.type).toBe("short_video");
    expect(brief.titles).toHaveLength(5);
    expect(brief.script60).toContain("Watch this agent finish the task");
    expect(brief.evidence.sources[0].url).toBe("https://example.test/launch");
  });

  it("builds the long-video sections and editorial questions", () => {
    const brief = buildBrief("event-1", "long_video") as any;

    expect(brief.type).toBe("long_video");
    expect(brief.sections).toHaveLength(8);
    expect(brief.questions).toHaveLength(5);
    expect(brief.questions.join(" ")).toContain("Example Agent");
  });

  it("builds the WeChat outline and fact-check list", () => {
    const brief = buildBrief("event-1", "wechat") as any;

    expect(brief.type).toBe("wechat");
    expect(brief.outline).toContain("限制与风险");
    expect(brief.numbersToVerify).toContain("价格与免费额度");
    expect(brief.risk).toBe("Verify the benchmark.");
  });

  it("rejects a brief request for a missing event", () => {
    mocks.getEvent.mockReturnValue(null);

    expect(() => buildBrief("missing", "wechat")).toThrow("Event not found");
  });
});
