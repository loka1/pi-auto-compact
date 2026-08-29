# Installation

## As a package (recommended)

```bash
# From npm
pi install npm:@loka1/pi-auto-compact

# From GitHub (optionally pinned to a version)
pi install git:github.com/loka1/pi-auto-compact
pi install git:github.com/loka1/pi-auto-compact@v0.1.1
```

## Manual

Copy `extensions/auto-context-compact.ts` to:

- `~/.pi/agent/extensions/` (global — all projects), or
- `.pi/extensions/` (project-local)

Then run `/reload` in pi (or restart) to load it.

## Verify

After loading, the footer status bar shows the active limit, e.g.:

```
auto-compact @20%
```

Run `/autocompact` to see the full configuration and the effective limit for the current model.
