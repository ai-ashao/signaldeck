# Implementation Notes

## Why SQLite

The user requirement is zero registration. SQLite gives immediate persistence on a Mac, NAS, home server or VPS with no external account.

Do not deploy this exact storage layer to ephemeral serverless filesystems. If the product proves useful, replace the DB module with Postgres/D1 later.

## Why no GitHub adapter in V1

AIHOT, Hacker News and Product Hunt already surface many GitHub projects. Adding GitHub Search increases source complexity without first proving a content discovery gap.

## Why heuristic scoring exists

A content radar should still work with zero AI API keys. The heuristic scorer makes the whole project runnable by default. Ollama is an optional local enhancement.

## Dedup

V1 uses:

1. exact normalized URL
2. fuzzy title similarity

It does not use a cloud LLM for same-event matching. If false merges/misses become a problem, add local Ollama event matching in V1.1.
