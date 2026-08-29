# pi-auto-compact

A [pi](https://github.com/earendil-works/pi-mono) extension that **automatically compacts the conversation context** when it drops to a configurable percentage remaining (default **20%**, i.e. 80% of the context window is used).

The limit can be set **globally** (all models) or **per model**, and a footer status bar shows the live context usage and the active limit.

## Features

- **Auto-compaction** fires when context reaches your threshold — leaves room for the LLM's response and keeps your session responsive.
- **Global or per-model limits:** set one default for everything, then override specific models by `provider/id` or bare `id`.
- **Live status bar:** `auto-compact @20% · ctx 62.3% used (37.7% left)` updates every turn and on model change.
- **Easy commands** to view and change the limit on the fly.

## Install

As a package (from git or npm):

```bash
pi install git:github.com/loka1/pi-auto-compact
# or
pi install npm:pi-auto-compact
```

Or drop the file at `~/.pi/agent/extensions/` (global) / `.pi/extensions/` (project-local) and `/reload`.

## Configuration

Config is merged from JSON files (project wins over global), or set interactively:

| File | Scope |
|------|-------|
| `~/.pi/agent/auto-compact.json` | Global |
| `.pi/auto-compact.json` | Project-local (wins) |

```json
{
  "enabled": true,
  "percentRemaining": 20,
  "cooldownTurns": 1,
  "models": {
    "deepseek/deepseek-v4-pro": 15,
    "gpt-4o": 25
  }
}
```

- `percentRemaining` — **global** default: compact when this % of context remains (20 = compact when 80% full).
- `models` — **per-model** overrides (win over global). Key by `"provider/id"` or bare `"id"`.
- `cooldownTurns` — minimum turns between automatic compactions.

## Commands

```
/autocompact                          → show config + current status
/autocompact set <percent>            → set global threshold
/autocompact model <id> <percent>     → set per-model threshold
/autocompact unset <id>               → remove a per-model override
/autocompact toggle                   → enable/disable

/set-auto-compact-limit 25                    → quick global set
/set-auto-compact-limit 15 model gpt-4o       → quick per-model set
```

## License

MIT
