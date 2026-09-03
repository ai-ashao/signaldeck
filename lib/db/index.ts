import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "signaldeck.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const globalForDb = globalThis as unknown as { __signaldeckDb?: Database.Database };
export const db = globalForDb.__signaldeckDb ?? new Database(dbPath);
if (process.env.NODE_ENV !== "production") globalForDb.__signaldeckDb = db;

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initDb() {
  db.exec(`
    create table if not exists source_configs (
      id text primary key,
      source_type text not null,
      name text not null,
      config text not null default '{}',
      enabled integer not null default 1,
      last_fetched_at text,
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    );

    create table if not exists raw_items (
      id text primary key,
      source_type text not null,
      source_name text not null,
      source_item_id text,
      title text not null,
      normalized_title text,
      summary text,
      url text not null,
      normalized_url text,
      original_url text,
      author text,
      published_at text,
      fetched_at text not null,
      metrics text not null default '{}',
      tags text not null default '[]',
      raw_data text,
      event_id text,
      created_at text not null default (datetime('now')),
      unique(source_type, source_item_id)
    );

    create index if not exists idx_raw_items_event on raw_items(event_id);
    create index if not exists idx_raw_items_url on raw_items(normalized_url);
    create index if not exists idx_raw_items_published on raw_items(published_at desc);

    create table if not exists events (
      id text primary key,
      canonical_title text not null,
      normalized_title text,
      summary text,
      primary_url text,
      source_count integer not null default 1,
      first_seen_at text not null,
      last_seen_at text not null,
      status text not null default 'pending',
      saved integer not null default 0,
      rule_score real not null default 0,
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    );

    create table if not exists event_sources (
      id text primary key,
      event_id text not null,
      raw_item_id text not null,
      created_at text not null default (datetime('now')),
      unique(event_id, raw_item_id),
      foreign key(event_id) references events(id) on delete cascade,
      foreign key(raw_item_id) references raw_items(id) on delete cascade
    );

    create table if not exists event_scores (
      id text primary key,
      event_id text not null unique,
      freshness integer not null,
      wow integer not null,
      visual integer not null,
      utility integer not null,
      hook integer not null,
      trend integer not null,
      audience integer not null,
      commercial integer not null,
      short_video_fit integer not null,
      long_video_fit integer not null,
      wechat_fit integer not null,
      overall_score integer not null,
      why text,
      best_angle text,
      hook_text text,
      risk text,
      model text,
      prompt_version text,
      created_at text not null default (datetime('now')),
      foreign key(event_id) references events(id) on delete cascade
    );

    create table if not exists content_jobs (
      id text primary key,
      event_id text not null,
      content_type text not null,
      status text not null default 'draft',
      brief text,
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now')),
      foreign key(event_id) references events(id)
    );
  `);

  seedSources();
}

function seedSources() {
  const defaults = [
    { id: "aihot", source_type: "aihot", name: "AIHOT", config: {} },
    { id: "hn", source_type: "hackernews", name: "Hacker News", config: {} },
    { id: "producthunt", source_type: "producthunt", name: "Product Hunt", config: { feedUrl: "https://www.producthunt.com/feed" } },
    { id: "rss-openai", source_type: "rss", name: "OpenAI", config: { feedUrl: "https://openai.com/news/rss.xml" } },
  ];
  const stmt = db.prepare(`insert or ignore into source_configs (id,source_type,name,config,enabled) values (@id,@source_type,@name,@config,1)`);
  for (const s of defaults) stmt.run({ ...s, config: JSON.stringify(s.config) });
}

initDb();
