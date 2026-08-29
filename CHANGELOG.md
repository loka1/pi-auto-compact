# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
