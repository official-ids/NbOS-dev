# Security Policy

Безопасность проекта / Project security.

## Supported versions

| Version | Supported |
| --- | --- |
| 1.0.x | yes |

## Reporting a vulnerability

If you find a security issue in NexKey, please do **not** open a public issue.

- Email: [iamytn@duck.com](mailto:iamytn@duck.com)
- Telegram: [@nbsp_acc](https://t.me/nbsp_acc)

Include: description, NexKey version and OS, steps to reproduce or proof of concept. You will get a response within 7 days, and a fix or a public disclosure timeline will be agreed with you.

## Security design notes

- The renderer runs with `contextIsolation: true`, `nodeIntegration: false` and a strict Content-Security-Policy (`default-src 'self'`, no remote origins). The only bridge to the system is a small audited preload API (`src/preload.js`).
- Websites are opened only through the OS default browser via `shell.openExternal` with an `http(s)` / `mailto` allowlist; no embedded browser, no remote content in the window.
- Configuration is a local JSON file (`config.json`). It is never synced or uploaded anywhere. Importing a config file from an unknown source is equivalent to running arbitrary bindings - review its `bindings[].target` fields first.
- The update check is a single read-only HTTPS GET to `api.github.com` and can be disabled in settings.
- NexKey installs no drivers, no services and no browser extensions. Autostart is a standard OS login item.
- The app never requests administrator rights itself. The optional "Run as administrator" flag launches the *target* program with a visible UAC prompt - you always see it.
