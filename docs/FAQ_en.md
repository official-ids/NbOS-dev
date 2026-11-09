# NexKey FAQ (English)

Русская версия: [FAQ_ru.md](FAQ_ru.md). Full manual: [HELP_en.md](HELP_en.md).

## General

**What is NexKey in one sentence?**
A background utility that opens any application, website or file by pressing a hotkey, system-wide, even when its window is closed.

**Is it free?**
Yes, the MIT license allows free use, modification and distribution.

**Does it collect any data?**
No telemetry, no analytics, no accounts. The only network request is the optional update check against GitHub Releases.

**What are the system requirements?**
Windows 10/11 (x64) or macOS 10.15+ (Intel and Apple Silicon). Nothing else.

## Hotkeys

**Can I use a single key without modifiers?**
Technically yes, but NexKey warns you: such a hotkey fires on every press system-wide, even while typing. Better use combinations like `Ctrl+Alt+Z`.

**My hotkey does not work. What should I check?**
1. The binding is enabled (toggle on the card).
2. Global pause is off (sidebar switch).
3. The card has no `!` badge - it means the combination is taken by another program.
4. Try another combination.

**Which combinations are safe to use?**
`Ctrl+Alt+<key>` is rarely used by other software. Avoid `Ctrl+C`, `Alt+Tab`, `Win`-only combos and single letters.

**Can the same hotkey launch two things?**
No. One combination - one binding. NexKey blocks duplicates on save.

## Types of bindings

**What can be opened?**
Applications (`.exe`, `.bat`, `.cmd`, `.lnk`, `.app`), websites (in the default browser) and any files or folders via the system default handler.

**I want to launch zapret. What exactly do I add?**
Type "Application", target = full path to `general.bat` (or `general.exe` - whatever your build has). Enable "Run as administrator" if the script asks for elevation. Assign a hotkey - done. A walkthrough is in [HELP_en.md](HELP_en.md), section 4.

**Does the website open in my default browser?**
Yes. NexKey does not embed any browser.

**Can I pass arguments to a program?**
Yes - the "Arguments" field in the binding dialog. Quotes are supported for paths with spaces.

## Background work

**Will it survive a reboot?**
Yes, if "Start with system" is enabled in the settings. This is a standard OS login item - after reboot NexKey starts in the tray and hotkeys are ready immediately.

**How do I close it completely?**
Use the tray icon menu - "Quit NexKey". The window close button hides the app by default (changeable in settings).

**Does it slow the PC down?**
No. It is a small Electron utility sitting in memory; CPU usage is zero while idle.

**Is my config kept after uninstalling?**
Yes. `%APPDATA%\nexkey\config.json` (Windows) or `~/Library/Application Support/nexkey/` (macOS) stays in place, so reinstalling restores everything. Export/import to JSON is also available.

## Updates and builds

**How do I update?**
Settings - About - "Check for updates", then download the new installer from Releases and install it over the old one. Nothing is deleted.

**Windows shows SmartScreen warning on the installer. Is it dangerous?**
The build is not code-signed with a paid certificate, so Windows shows the standard warning. Click "More info" - "Run anyway". The source code is open - you can also build the installer yourself (`npm run dist:win`).

**macOS says the app is from an unknown developer.**
Run once: `xattr -cr /Applications/NexKey.app`.

**Can I build it for Linux?**
An AppImage target is already declared in `package.json` (`npm run dist` on Linux). It is not officially supported or tested yet, but contributions are welcome.

## Contacts

Something not covered here? Telegram [@nbsp_acc](https://t.me/nbsp_acc), email [iamytn@duck.com](mailto:iamytn@duck.com), or open an issue at [github.com/official-ids/NbOS-dev/issues](https://github.com/official-ids/NbOS-dev/issues).
