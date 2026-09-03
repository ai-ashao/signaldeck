import { randomUUID } from "node:crypto";
import { db } from "./index";
import type { ContentType, RawItem, ScoreResult } from "./types";
import { normalizeTitle } from "@/lib/normalize/title";
import { isSafeHttpUrl, normalizeUrl } from "@/lib/normalize/url";

export function listSourceConfigs() {
  return db.prepare(`select * from source_configs order by source_type,name`).all().map((r: any) => ({
    ...r, enabled: Boolean(r.enabled), config: JSON.parse(r.config || "{}")
  }));
}

export function updateSourceEnabled(id: string, enabled: boolean) {
  db.prepare(`update source_configs set enabled=?, updated_at=datetime('now') where id=?`).run(enabled ? 1 : 0, id);
}

export function addRssSource(name: string, feedUrl: string) {
  const id = `rss-${randomUUID()}`;
  db.prepare(`insert into source_configs (id,source_type,name,config,enabled) values (?,?,?,?,1)`)
    .run(id, "rss", name, JSON.stringify({ feedUrl }));
  return id;
}

export function markSourceFetched(id: string) {
  db.prepare(`update source_configs set last_fetched_at=datetime('now') where id=?`).run(id);
}

export function insertRawItem(item: RawItem) {
  if (!isSafeHttpUrl(item.url)) return false;
  const originalUrl = item.originalUrl && isSafeHttpUrl(item.originalUrl) ? item.originalUrl : item.url;
  const stmt = db.prepare(`
    insert or ignore into raw_items
    (id,source_type,source_name,source_item_id,title,normalized_title,summary,url,normalized_url,original_url,author,published_at,fetched_at,metrics,tags,raw_data)
    values (@id,@source,@sourceName,@sourceItemId,@title,@normalizedTitle,@summary,@url,@normalizedUrl,@originalUrl,@author,@publishedAt,@fetchedAt,@metrics,@tags,@rawData)
  `);
  const result = stmt.run({
    ...item,
    sourceItemId: item.sourceItemId || item.id,
    normalizedTitle: normalizeTitle(item.title),
    normalizedUrl: normalizeUrl(item.url),
    summary: item.summary || null,
    originalUrl,
    author: item.author || null,
    publishedAt: item.publishedAt || null,
    metrics: JSON.stringify(item.metrics || {}),
    tags: JSON.stringify(item.tags || []),
    rawData: JSON.stringify(item.rawData || {}),
  });
  return result.changes > 0;
}

export function getUnassignedRawItems(limit = 500) {
  return db.prepare(`select * from raw_items where event_id is null order by coalesce(published_at,fetched_at) desc limit ?`).all(limit) as any[];
}

export function createEventFromRaw(raw: any) {
  const id = randomUUID();
  const seen = raw.published_at || raw.fetched_at || new Date().toISOString();
  db.prepare(`insert into events (id,canonical_title,normalized_title,summary,primary_url,first_seen_at,last_seen_at) values (?,?,?,?,?,?,?)`)
    .run(id, raw.title, raw.normalized_title, raw.summary, raw.original_url || raw.url, seen, seen);
  attachRawToEvent(raw.id, id);
  return id;
}

export function attachRawToEvent(rawItemId: string, eventId: string) {
  db.prepare(`update raw_items set event_id=? where id=?`).run(eventId, rawItemId);
  db.prepare(`insert or ignore into event_sources (id,event_id,raw_item_id) values (?,?,?)`).run(randomUUID(), eventId, rawItemId);
  const row = db.prepare(`select count(distinct source_type) as c, min(coalesce(published_at,fetched_at)) as first_seen, max(coalesce(published_at,fetched_at)) as last_seen from raw_items where event_id=?`).get(eventId) as any;
  db.prepare(`update events set source_count=?, first_seen_at=?, last_seen_at=?, updated_at=datetime('now') where id=?`).run(row.c || 1, row.first_seen, row.last_seen, eventId);
}

export function findCandidateEvents(normalizedTitle: string, normalizedUrl: string, limit = 30) {
  return db.prepare(`
    select e.* from events e
    where e.status != 'ignored'
    and (
      e.normalized_title like ? or
      exists(select 1 from raw_items r where r.event_id=e.id and r.normalized_url=?)
    )
    order by e.last_seen_at desc limit ?
  `).all(`%${normalizedTitle.slice(0, 28)}%`, normalizedUrl, limit) as any[];
}

export function listRecentEventsForDedup(limit = 150) {
  return db.prepare(`select * from events where status != 'ignored' order by last_seen_at desc limit ?`).all(limit) as any[];
}

export function setRuleScore(eventId: string, score: number) {
  db.prepare(`update events set rule_score=?, updated_at=datetime('now') where id=?`).run(score, eventId);
}

export function upsertScore(eventId: string, score: ScoreResult) {
  db.prepare(`
    insert into event_scores
    (id,event_id,freshness,wow,visual,utility,hook,trend,audience,commercial,short_video_fit,long_video_fit,wechat_fit,overall_score,why,best_angle,hook_text,risk,model,prompt_version)
    values (@id,@eventId,@freshness,@wow,@visual,@utility,@hook,@trend,@audience,@commercial,@short_video_fit,@long_video_fit,@wechat_fit,@overall_score,@why,@best_angle,@hook_text,@risk,@model,@prompt_version)
    on conflict(event_id) do update set
      freshness=excluded.freshness,wow=excluded.wow,visual=excluded.visual,utility=excluded.utility,hook=excluded.hook,
      trend=excluded.trend,audience=excluded.audience,commercial=excluded.commercial,short_video_fit=excluded.short_video_fit,
      long_video_fit=excluded.long_video_fit,wechat_fit=excluded.wechat_fit,overall_score=excluded.overall_score,
      why=excluded.why,best_angle=excluded.best_angle,hook_text=excluded.hook_text,risk=excluded.risk,model=excluded.model,
      prompt_version=excluded.prompt_version,created_at=datetime('now')
  `).run({ id: randomUUID(), eventId, ...score });
  db.prepare(`update events set status=case when status='pending' then 'scored' else status end, updated_at=datetime('now') where id=?`).run(eventId);
}

export function getEvents(tab = "top", limit = 30) {
  let order = "coalesce(s.overall_score, e.rule_score) desc, e.last_seen_at desc";
  let where = "e.status != 'ignored'";
  if (tab === "short") order = "coalesce(s.short_video_fit,0) desc, e.last_seen_at desc";
  if (tab === "long") order = "coalesce(s.long_video_fit,0) desc, e.last_seen_at desc";
  if (tab === "wechat") order = "coalesce(s.wechat_fit,0) desc, e.last_seen_at desc";
  if (tab === "saved") where = "e.saved=1 and e.status != 'ignored'";
  if (tab === "ignored") where = "e.status='ignored'";
  if (tab === "all") order = "e.last_seen_at desc";
  return db.prepare(`
    select e.*, s.*,
      e.id as event_id,
      (select group_concat(distinct source_name) from raw_items r where r.event_id=e.id) as source_names
    from events e left join event_scores s on s.event_id=e.id
    where ${where}
    order by ${order}
    limit ?
  `).all(limit) as any[];
}

export function getEvent(id: string) {
  const event = db.prepare(`select e.*, s.*, e.id as event_id from events e left join event_scores s on s.event_id=e.id where e.id=?`).get(id) as any;
  if (!event) return null;
  const sources = db.prepare(`select * from raw_items where event_id=? order by coalesce(published_at,fetched_at) desc`).all(id).map((r: any) => ({
    ...r, metrics: JSON.parse(r.metrics || "{}"), tags: JSON.parse(r.tags || "[]"), raw_data: JSON.parse(r.raw_data || "{}")
  }));
  return { ...event, sources };
}

export function setEventAction(id: string, action: "save"|"unsave"|"ignore"|"restore") {
  if (action === "save") db.prepare(`update events set saved=1 where id=?`).run(id);
  if (action === "unsave") db.prepare(`update events set saved=0 where id=?`).run(id);
  if (action === "ignore") db.prepare(`update events set status='ignored' where id=?`).run(id);
  if (action === "restore") db.prepare(`update events set status='scored' where id=?`).run(id);
}

export function createContentJob(eventId: string, contentType: ContentType, brief: unknown) {
  const id = randomUUID();
  db.prepare(`insert into content_jobs (id,event_id,content_type,brief) values (?,?,?,?)`).run(id,eventId,contentType,JSON.stringify(brief));
  db.prepare(`update events set status='selected' where id=?`).run(eventId);
  return id;
}

export function getContentJob(id: string) {
  const row = db.prepare(`select j.*, e.canonical_title,e.primary_url from content_jobs j join events e on e.id=j.event_id where j.id=?`).get(id) as any;
  if (!row) return null;
  return { ...row, brief: JSON.parse(row.brief || "{}") };
}

export function getStats() {
  const q = (sql: string) => (db.prepare(sql).get() as any).c as number;
  return {
    raw: q(`select count(*) c from raw_items where datetime(fetched_at) >= datetime('now','-24 hours')`),
    events: q(`select count(*) c from events where datetime(last_seen_at) >= datetime('now','-24 hours')`),
    scored: q(`select count(*) c from event_scores where datetime(created_at) >= datetime('now','-24 hours')`),
    selected: q(`select count(*) c from content_jobs where datetime(created_at) >= datetime('now','-24 hours')`),
  };
}
