# Changelog

All notable changes to NexKey are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-11-09

### Fixed

- Console scripts (.bat / .cmd) now start in their own console, minimized to the
  taskbar, with working script input. Previously they were run inline with a
  closed input stream: interactive scripts (menus, prompts) could stall for
  minutes before doing anything, and terminal windows popped up over other apps.
- Application launches are more robust: if a direct spawn fails, the launch
  falls back to the OS shell handler instead of failing silently.
- Launch latency is measured and written to the log for diagnostics.

## [1.0.0] - 2026-11-09

First public release. Developed by NsOS Dev x 76 School.

### Added

- Core: global hotkey launcher for applications, websites and files/folders.
- Binding types: Application (.exe, .bat, .cmd, .lnk, .app), Website URL, File / folder.
- Hotkey recorder with modifier support (Ctrl, Alt, Shift, Win / Cmd) and F-keys.
- Launch arguments for applications; optional "Run as administrator" (Windows).
- Binding manager: enable/disable, pause and resume, edit, reorder, delete, search, type filters.
- Global pause switch with tray integration.
- Statistics: launch counters and last-run time per binding; statistics reset.
- Background mode: tray icon, start with system, start minimized to tray, close-to-tray.
- Single instance guard; second launch focuses the existing window.
- Hotkey conflict detection with per-binding warning badges.
- Settings: language (EN/RU), theme (black/white), autostart, start hidden, close to tray, notifications, automatic update check.
- Export / import of the full configuration as JSON.
- Update checker against GitHub Releases (one request, offline-safe).
- First-run onboarding dialog.
- Strict black & white interface with animations; no emojis anywhere.
- Full English and Russian localization of UI, docs and installer.
- Windows installer (NSIS) and portable build; macOS dmg (Intel and Apple Silicon).
- GitHub Actions workflow: automatic Windows/macOS builds on tags and manual dispatch.
- Documentation set: README (en/ru), INSTALL (en/ru), HELP (en/ru), FAQ (en/ru), QUICKSTART (en/ru), CHANGELOG, CONTRIBUTING, SECURITY, landing page.
