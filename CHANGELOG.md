# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [2.5.0]

### Added

- Added view-date frontmatter sync support with configurable property name and date format.
- Added new settings for:
  - Sync view date
  - Viewed date property name (default: `viewed_at`)
  - Viewed date format (`YYYY-MM-DD` by default)
- Added `build:local` and `copy-to-local` scripts for local Obsidian vault testing.
- Added zh-CN localization for settings labels and descriptions.
- Added `vault.create` based new-file marking to make new-note handling deterministic.
- Added selective sync methods:
  - `syncViewCountToFrontmatterOnly()`
  - `syncViewDateToFrontmatterOnly()`

### Changed

- Refactored settings UI into grouped sections and adopted `SettingGroup` with runtime compatibility fallback for older Obsidian API versions.
- Updated release workflow to newer GitHub Actions versions and automatic release-notes extraction from `CHANGELOG.md`.
- Switched active-leaf behavior to only refresh status bar; counting now happens on file-open path.
- Updated dependencies and toolchain:
  - `obsidian` to `^1.12.3`
  - TypeScript to `^5`
  - `@typescript-eslint/*` to `^8.58.1`
  - `esbuild` to `^0.28.0`
  - `esbuild-svelte` to `^0.9.4`
  - `svelte-preprocess` to `^6.0.3`
  - `tslib` to `^2.8.1`
  - plus related type packages updates
- Improved excluded-paths input UX:
  - changed to textarea
  - supports separators by comma and newline

### Fixed

- Fixed new-note counting semantics so `Skip new notes` truly skips first-open counting and frontmatter writes.
- Fixed issue where newly created notes could show `view_count: 2` unexpectedly.
- Fixed issue where changing count method refreshed `viewed_at` for all notes; count-method changes now sync only view-count fields.
- Fixed EventManager singleton lifecycle leak by resetting singleton state on plugin unload.
