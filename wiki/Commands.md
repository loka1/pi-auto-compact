# Commands

```
/autocompact                            → show config + effective limit for current model
/autocompact set <percent>              → set the GLOBAL limit
/autocompact model <id> <percent>       → set a PER-MODEL limit (overrides global)
/autocompact unset <id>                 → remove a per-model override
/autocompact toggle                     → enable/disable auto-compaction

# Quick one-command aliases:
/set-auto-compact-limit 25                     → set the GLOBAL limit (compact when 25% left)
/set-auto-compact-limit 15 model gpt-4o        → set a PER-MODEL limit for "gpt-4o"
```

## Examples

Set the global limit so every model compacts when 20% of context remains:

```
/set-auto-compact-limit 20
```

Give one specific model a tighter override:

```
/set-auto-compact-limit 15 model inferx/deepseek-v4-flash-0731
```

Make a model follow the global limit instead of its override:

```
/autocompact unset inferx/deepseek-v4-flash-0731
```

## Notes

- Per-model limits always win over the global one.
- Use `provider/id` (e.g. `inferx/deepseek-v4-flash-0731`) or bare `id` (e.g. `gpt-4o`).
- All changes are saved to the config file and take effect immediately — no reload needed.
- The footer status bar shows the active limit for the current model, e.g. `auto-compact @15%`.
