# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.2] - 2026-09-16

### Added
- **Resume after auto-compaction** (`continueAfterCompact`, default `true`).
  pi's manual compaction aborts the running turn and never resumes it, so the
  agent used to stop right after an auto-compaction. The extension now sends a
  follow-up message (`continuePrompt`, customizable) once compaction finishes so
  the agent keeps working from where it left off. Skipped when the context is
  still above the threshold, to avoid a compact → resume → compact loop.
- `/autocompact continue [on|off]` and a `resume after compaction` line in
  `/autocompact` status.

## [0.3.1] - 2026-09-16

### Fixed
- **`Cannot read properties of undefined (reading 'signal')` crash on auto-compaction.**
  The extension could start a second manual compaction while a previous one was
  still running (it only checked `cooldownTurns`, and usage stays above the
  threshold until compaction finishes). Concurrent manual compactions race pi's
  single `_compactionAbortController`, and whichever finishes first clears it,
  leaving the other to read `undefined.signal`. An in-flight guard now blocks a
  new auto-compaction until the running one calls `onComplete`/`onError`, with
  `session_compact` / `session_compact_failed` as a safety net.

## [0.3.0] - 2026-08-29

### Changed (breaking)
- **Limit semantics changed from "% remaining" to "% USED".**
  The setting is now `compactAtPercent`: **compact when this % of the context
  window is used** (20 = compact at 20% used). Lower = compact sooner; higher =
  wait longer. The status bar now reads e.g. `auto-compact @20% used`.
  - Config key renamed `percentRemaining` → `compactAtPercent`.
    Legacy `percentRemaining` config is migrated automatically (`100 - value`).
  - CLI help/notifications updated to "compact at X% used".

## [0.2.0] - 2026-08-29

### Changed
- **Renamed npm scope from `@loka_s` to `@loka1`** to match the GitHub account.
  The package is now published as **`@loka1/pi-auto-compact`**.
- Added `homepage`, `repository`, and `bugs` links pointing to the GitHub repo.

## [0.1.2] - 2026-08-29

### Added
- **Gallery preview image** for the pi package gallery (`assets/preview.png`, set via `pi.image`).
- **GitHub Actions**: auto-publish to npm on `v*` tags, and auto-sync the `wiki/` folder to the GitHub wiki.

### Changed
- `CHANGELOG.md` added and included in the published package.

### Changed
- **Status bar simplified** to show only the active limit (e.g. `auto-compact @15%`)
  instead of the long `· ctx X% used (Y% left)` text — cleaner and easier to read.
- Expanded README command docs, clarifying the **global vs. per-model** limits and
  how per-model overrides always win.

### Added
- Wiki pages (`Home`, `Installation`, `Configuration`, `Commands`).
- Gallery preview image for the pi package gallery.

## [0.1.0] - 2026-08-29

### Added
- Initial release as a pi package (`pi-package`).
- **Auto-compaction** triggers when the context drops to a configurable percentage
  remaining (default 20% = 80% of context window used).
- **Global** (`percentRemaining`) and **per-model** (`models`) limits — per-model
  overrides always win over the global default. Keyed by `provider/id` or bare `id`.
- **Live status-bar indicator** showing the active limit, updated every turn and on
  model change.
- Commands:
  - `/autocompact` (view config + effective limit)
  - `/autocompact set <pct>` (global)
  - `/autocompact model <id> <pct>` (per-model)
  - `/autocompact unset <id>`
  - `/autocompact toggle`
  - `/set-auto-compact-limit <pct> [model <id>]` (quick set)
- Config file merge: `~/.pi/agent/auto-compact.json` (global) + `.pi/auto-compact.json`
  (project-local, wins).
- `cooldownTurns` to avoid repeated auto-compactions.
