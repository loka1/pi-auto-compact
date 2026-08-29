# Configuration

Config is merged from JSON files. **Project** config wins over **global**.

| File | Scope |
|------|-------|
| `~/.pi/agent/auto-compact.json` | Global |
| `.pi/auto-compact.json` | Project-local (wins) |

```json
{
  "enabled": true,
  "compactAtPercent": 20,
  "cooldownTurns": 1,
  "models": {
    "deepseek/deepseek-v4-pro": 15,
    "gpt-4o": 25
  }
}
```

## Fields

| Field | Description |
|-------|-------------|
| `enabled` | Master on/off switch. |
| `compactAtPercent` | **Global** default — **compact when this % of the context window is used** (20 = compact when 20% used; higher waits longer, lower compacts sooner). |
| `cooldownTurns` | Minimum turns between automatic compactions. |
| `models` | **Per-model** overrides, keyed by `"provider/id"` or bare `"id"`. Always win over the global value. |

> The compact threshold is computed from the active model's `contextWindow`, so it works for any model with any window size — including DeepSeek, InferX, Anthropic, OpenAI, etc.

Per-model overrides **always win** over the global one. To make a model fall back to the global limit, remove its override with `/autocompact unset <id>`.
