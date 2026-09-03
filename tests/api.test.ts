import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  buildBrief: vi.fn(),
  createContentJob: vi.fn(),
  setEventAction: vi.fn(),
}));

vi.mock("@/lib/content/generate", () => ({ buildBrief: mocks.buildBrief }));
vi.mock("@/lib/db/queries", () => ({
  createContentJob: mocks.createContentJob,
  setEventAction: mocks.setEventAction,
}));

import { POST as createJob } from "../app/api/content-jobs/route";
import { POST as changeEvent } from "../app/api/events/[id]/action/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.buildBrief.mockReturnValue({ type: "wechat" });
  mocks.createContentJob.mockReturnValue("job-1");
});

describe("content job API validation", () => {
  it("returns 400 for a missing event or unsupported content type", async () => {
    const response = await createJob(
      new NextRequest("http://localhost/api/content-jobs", {
        method: "POST",
        body: JSON.stringify({ eventId: "", contentType: "podcast" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Bad request" });
    expect(mocks.createContentJob).not.toHaveBeenCalled();
  });

  it("creates a validated content job and returns its id", async () => {
    const response = await createJob(
      new NextRequest("http://localhost/api/content-jobs", {
        method: "POST",
        body: JSON.stringify({ eventId: "event-1", contentType: "wechat" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: "job-1" });
    expect(mocks.buildBrief).toHaveBeenCalledWith("event-1", "wechat");
    expect(mocks.createContentJob).toHaveBeenCalledWith("event-1", "wechat", {
      type: "wechat",
    });
  });
});

describe("event action API validation", () => {
  it("returns 400 without mutating state for an unsupported action", async () => {
    const response = await changeEvent(
      new NextRequest("http://localhost/api/events/event-1/action", {
        method: "POST",
        body: JSON.stringify({ action: "delete" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "event-1" }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.setEventAction).not.toHaveBeenCalled();
  });

  it("accepts a supported action and updates the requested event", async () => {
    const response = await changeEvent(
      new NextRequest("http://localhost/api/events/event-1/action", {
        method: "POST",
        body: JSON.stringify({ action: "ignore" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "event-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.setEventAction).toHaveBeenCalledWith("event-1", "ignore");
  });
});
