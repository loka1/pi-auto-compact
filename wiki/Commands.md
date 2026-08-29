# Commands

```
/autocompact                            → show config + effective limit for current model
/autocompact set <percent>              → set the GLOBAL limit (compact when this % used)
/autocompact model <id> <percent>       → set a PER-MODEL limit (overrides global)
/autocompact unset <id>                 → remove a per-model override
/autocompact toggle                     → enable/disable auto-compaction

# Quick one-command aliases (value = % of context USED at which to compact):
/set-auto-compact-limit 20                     → compact at 20% used (global)
/set-auto-compact-limit 10 model gpt-4o        → compact at 10% used for "gpt-4o"
```

> **What the number means:** the value is the **% of the context window that is USED**
> at which compaction triggers. Lower = compact sooner (keeps context tiny);
> higher = wait longer before compacting.

## Examples

Compact every model once **20%** of its context is used (global):

```
/set-auto-compact-limit 20
```

Give one specific model an aggressive limit (compact at **10%** used):

```
/set-auto-compact-limit 10 model inferx/deepseek-v4-flash-0731
```

Make a model follow the global limit instead of its override:

```
/autocompact unset inferx/deepseek-v4-flash-0731
```

## Notes

- Per-model limits always win over the global one.
- Use `provider/id` (e.g. `inferx/deepseek-v4-flash-0731`) or bare `id` (e.g. `gpt-4o`).
- All changes are saved to the config file and take effect immediately — no reload needed.
- The footer status bar shows the active limit for the current model, e.g. `auto-compact @20% used`.
