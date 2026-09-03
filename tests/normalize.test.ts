import { describe, expect, it } from "vitest";

import { normalizeTitle, titleSimilarity, titleTokens } from "../lib/normalize/title";
import { isSafeHttpUrl, normalizeUrl } from "../lib/normalize/url";
import { assertPublicUrl, assertSafeUrlSyntax, isPrivateAddress } from "../lib/sources/helpers";

describe("title normalization", () => {
  it("normalizes casing, punctuation, emoji, and whitespace", () => {
    expect(normalizeTitle("  Introducing: AI—Agent 🚀  ")).toBe("introducing ai agent");
  });

  it("removes stop words and one-character tokens", () => {
    expect([...titleTokens("The New AI Tool for a Better Workflow")]).toEqual([
      "ai",
      "tool",
      "better",
      "workflow",
    ]);
  });

  it("uses Dice similarity and handles empty token sets", () => {
    expect(titleSimilarity("AI agent workflow", "AI agent demo")).toBeCloseTo(2 / 3);
    expect(titleSimilarity("the a and", "or to the")).toBe(0);
  });
});

describe("URL normalization", () => {
  it("removes tracking parameters, fragments, and a trailing slash", () => {
    expect(
      normalizeUrl(
        "https://EXAMPLE.com/products/demo/?utm_source=newsletter&ref=home&id=42#details",
      ),
    ).toBe("https://example.com/products/demo?id=42");
  });

  it("returns trimmed input when the URL is invalid", () => {
    expect(normalizeUrl("  not a url  ")).toBe("not a url");
  });

  it("allows only credential-free HTTP(S) links", () => {
    expect(isSafeHttpUrl("https://example.com/article")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("https://user:pass@example.com/")).toBe(false);
    expect(isSafeHttpUrl("not a url")).toBe(false);
  });
});

describe("public URL validation", () => {
  it("blocks loopback, private, and link-local network addresses", () => {
    expect(isPrivateAddress("127.0.0.1")).toBe(true);
    expect(isPrivateAddress("10.0.0.4")).toBe(true);
    expect(isPrivateAddress("169.254.169.254")).toBe(true);
    expect(isPrivateAddress("::1")).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
  });

  it("rejects private hosts, non-HTTP protocols, and embedded credentials", async () => {
    expect(() => assertSafeUrlSyntax("http://localhost/admin")).toThrow("Private network");
    expect(() => assertSafeUrlSyntax("file:///etc/passwd")).toThrow("Only HTTP");
    expect(() => assertSafeUrlSyntax("https://user:pass@8.8.8.8/")).toThrow("credentials");
  });

  it("accepts a public IP URL without a DNS lookup", async () => {
    await expect(assertPublicUrl("https://8.8.8.8/")).resolves.toBeInstanceOf(URL);
  });
});
