export function isSafeHttpUrl(input: string) {
  try {
    const url = new URL(input);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function normalizeUrl(input: string) {
  try {
    const u = new URL(input);
    u.hash = "";
    const drop = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","ref","source","mc_cid","mc_eid"];
    for (const key of [...u.searchParams.keys()]) {
      if (drop.includes(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) u.searchParams.delete(key);
    }
    u.hostname = u.hostname.toLowerCase();
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");
    return u.toString();
  } catch {
    return input.trim();
  }
}
