import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_REDIRECTS = 5;

export function isPrivateAddress(address: string) {
  const value = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (value.startsWith("::ffff:")) return isPrivateAddress(value.slice(7));

  if (isIP(value) === 4) {
    const [a, b] = value.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  if (isIP(value) === 6) {
    return (
      value === "::" ||
      value === "::1" ||
      value.startsWith("fc") ||
      value.startsWith("fd") ||
      /^fe[89ab]/.test(value)
    );
  }

  return false;
}

function isProxyPlaceholderAddress(address: string) {
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split(".").map(Number);
  return a === 198 && (b === 18 || b === 19);
}

export function assertSafeUrlSyntax(input: string) {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Only HTTP(S) URLs are supported");
  if (url.username || url.password) throw new Error("URLs with embedded credentials are not supported");

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("Private network URLs are not supported");
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("Private network URLs are not supported");
  }

  return url;
}

export async function assertPublicUrl(input: string) {
  const url = assertSafeUrlSyntax(input);
  const hostname = url.hostname.toLowerCase();
  if (isIP(hostname)) return url;

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (
    !addresses.length ||
    addresses.some(({ address }) => isPrivateAddress(address) && !isProxyPlaceholderAddress(address))
  ) {
    throw new Error("Private network URLs are not supported");
  }
  return url;
}

export async function safeFetch(url: string, init: RequestInit = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let current = await assertPublicUrl(url);
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
      const res = await fetch(current, {
        ...init,
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "user-agent": "SignalDeck/0.1 (+personal content research)",
          "accept": "application/json, application/xml, text/xml, text/html;q=0.9, */*;q=0.8",
          ...(init.headers || {}),
        },
        cache: "no-store",
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) throw new Error(`Redirect without location for ${current}`);
        if (redirects === MAX_REDIRECTS) throw new Error(`Too many redirects for ${url}`);
        current = await assertPublicUrl(new URL(location, current).toString());
        continue;
      }

      if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${current}`);
      return res;
    }

    throw new Error(`Too many redirects for ${url}`);
  } finally {
    clearTimeout(timer);
  }
}

export function stripHtml(input = "") {
  return input.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim();
}

export function ensureArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}
