# SignalDeck V1 Spec — Zero-Key Edition

## Goal

每天把公开 AI 信息源收敛为可执行的内容候选：

```text
Public sources → Raw Items → Events → Dedup → Score → Top 10 → Human selects 1–3
```

## V1 Sources

1. AIHOT anonymous REST
2. Hacker News public API
3. Product Hunt RSS
4. User-configured RSS / Atom (OpenAI feed seeded by default)
5. Manual URL

## Explicitly excluded

- GitHub Search
- X API
- Product Hunt GraphQL API
- generic crawler
- vector database
- multi-agent pipeline
- auto-publishing

## Zero-Key scoring

Default scorer is deterministic and works offline after content is fetched. It scores:

- Freshness
- Wow
- Visual
- Utility
- Hook
- Trend
- Audience fit
- Commercial fit
- Short video fit
- Long video fit
- WeChat fit

Optional local Ollama can replace the heuristic scorer without any API registration.

## Storage

Local SQLite. This is deliberate: V1 is personal/local-first and requires no database account.

## Success criteria

- daily raw items >= 100 when sources are active
- event dedup reduces repeated coverage
- Top 10 contains >= 7 items the operator considers worth reviewing
- daily manual review <= 10 minutes

## Production principle

SignalDeck is a discovery/research system, not a content-copying system. Before publishing, return to the original/official source and verify facts, pricing, availability and quantitative claims.
