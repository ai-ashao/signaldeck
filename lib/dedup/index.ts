import { db } from "@/lib/db";
import { attachRawToEvent, createEventFromRaw, getUnassignedRawItems, listRecentEventsForDedup } from "@/lib/db/queries";
import { titleSimilarity } from "@/lib/normalize/title";

export function dedupPendingRawItems() {
  const raws = getUnassignedRawItems(500);
  let created = 0, merged = 0;
  for (const raw of raws) {
    const exact = raw.normalized_url ? db.prepare(`select event_id from raw_items where normalized_url=? and event_id is not null limit 1`).get(raw.normalized_url) as any : null;
    if (exact?.event_id) { attachRawToEvent(raw.id, exact.event_id); merged++; continue; }

    const candidates = listRecentEventsForDedup(120);
    let best: any = null; let bestScore = 0;
    for (const event of candidates) {
      const sim = titleSimilarity(raw.title, event.canonical_title);
      if (sim > bestScore) { bestScore = sim; best = event; }
    }
    if (best && bestScore >= 0.72) { attachRawToEvent(raw.id, best.id); merged++; }
    else { createEventFromRaw(raw); created++; }
  }
  return { created, merged, processed: raws.length };
}
