# NexKey - full manual (English)

Version 1.0.0. Also available: [Russian version](HELP_ru.md), [FAQ](FAQ_en.md), [Install guide](INSTALL_en.md).

## 1. What NexKey is

NexKey is a background utility for Windows 10/11 and macOS that launches applications, opens websites and opens files or folders by pressing a hotkey. The app lives in the system tray, starts together with the operating system and keeps your hotkeys working around the clock.

Typical use case: you run `zapret\general.bat` (or any other script or program) many times a day. With NexKey you assign `Ctrl+Alt+Z` to it once and launch it from anywhere with one press.

## 2. Installation

See the [install guide](INSTALL_en.md) for the three ways to get NexKey: ready builds from GitHub Releases, a portable version, or building from source. On macOS, an unsigned app must be allowed once after moving to `/Applications`:

```bash
xattr -cr /Applications/NexKey.app
```

Then open it normally (right-click - Open if Gatekeeper still complains).

## 3. First launch

1. NexKey starts. If the "Start minimized to tray" setting is enabled (default), the window will not appear and you will see a notification that NexKey is running in the background. Open it from the tray icon.
2. On the very first run a short welcome dialog with three steps appears.
3. The main window shows the binding list, the sidebar contains navigation, the global hotkey switch and the status chip.

## 4. Creating a binding

Click **New binding** (or press `Ctrl+N` inside the app). The dialog has the following fields:

### 4.1 Name

Any label, for example `Zapret launcher` or `Work folder`. Shown in the list and in launch notifications.

### 4.2 Type

| Type | What it opens | How to set the target |
| --- | --- | --- |
| Application | `.exe`, `.bat`, `.cmd`, `.lnk`, on macOS also `.app` | Browse button or paste a path |
| Website | Default browser with the address | Type a URL (`youtube.com` is enough) |
| File / folder | Any file with its default program, or the folder in Explorer/Finder | Browse button (files and folders allowed) |

### 4.3 Target

- **Application**: full path to the executable. For `.bat`/`.cmd` files NexKey runs them through `cmd /c` in their own folder, so scripts like `general.bat` work correctly.
- **Website**: `https://` is added automatically; `youtube.com` becomes `https://youtube.com`.
- **File / folder**: opened with the system default handler.

### 4.4 Arguments (applications only)

Optional command-line arguments. Quotes are supported: `--mode fast "C:\path with spaces"`.

### 4.5 Run as administrator (Windows, applications only)

Launches the target via PowerShell `Start-Process -Verb RunAs`. A UAC prompt appears on every launch. Useful for tools that need elevation. Not available for `.lnk` shortcuts and on macOS.

### 4.6 Hotkey

Click the field and press the combination. The recorder shows pressed modifiers as keycaps.

Supported: letters `A`-`Z`, digits, `F1`-`F12`, `Space`, arrows, `Home`, `End`, `PageUp`, `PageDown`, `Insert`, `Delete`, punctuation `` ` - = [ ] \ ; ' , . / `` and modifiers `Ctrl`, `Alt`, `Shift`, `Win` (macOS: `Cmd`).

Notes:

- `Esc` cancels recording, `Backspace` clears the current value.
- A key **without modifiers** works too, but NexKey warns you: such a hotkey fires on every press system-wide, even while you type.
- Recommended practice: always include at least one modifier (`Ctrl+Alt+...`), this avoids conflicts with typing and with other apps.
- If the combination is already taken by another program, NexKey will register nothing and show a warning - the binding card will get a dashed border with a `!` badge. Choose another combination.

### 4.7 Test run

The **Test run** button in the dialog executes the target immediately, without saving. Handy to verify a path or arguments.

## 5. Managing bindings

Each card in the list shows the type icon, name, target, hotkey keycaps, launch counter, last-run time and controls:

| Control | Action |
| --- | --- |
| Switch | Enable or disable the binding (disabled bindings release their hotkey) |
| Play icon | Run the binding now |
| Pencil icon | Edit the binding |
| Up / down icons | Move the binding in the list |
| Trash icon | Delete the binding (with confirmation) |

Above the list:

- **Search** - filters by name, target and hotkey (`/` focuses the field).
- **Filter chips** - All / Apps / Sites / Files.
- Header shows how many bindings are active.

## 6. Global pause

The **Hotkeys active** switch in the sidebar suspends all hotkeys at once without deleting anything. While paused:

- the status chip shows "Hotkeys paused";
- a dashed banner appears above the list;
- the tray menu item switches to "Resume all hotkeys".

The paused state is remembered across restarts.

## 7. Settings

### General

| Setting | Meaning |
| --- | --- |
| Language | English or Russian, applied instantly |
| Theme | Black (default) or White |
| Start with system | Standard OS login item; NexKey then starts after every reboot |
| Start minimized to tray | The window stays hidden at launch; a notification confirms the app is running |
| Close button hides to tray | Closing the window does not exit the app |

### Behavior

| Setting | Meaning |
| --- | --- |
| Launch notifications | Small system toast on every hotkey launch |
| Check for updates automatically | One request to GitHub Releases at startup |

### Data

| Action | Meaning |
| --- | --- |
| Export configuration | Save settings + all bindings to a JSON file |
| Import configuration | Restore from a JSON file created by NexKey |
| Reset statistics | Zero all launch counters |
| Erase everything | Delete all bindings and settings (double confirmation) |

### About

Version, "Check for updates" button and links: GitHub repository, 76 School website, Telegram, email.

## 8. Tray and background mode

The tray icon opens a menu with: **Open NexKey**, **Pause / Resume all hotkeys**, **Start with system** (checkbox), **Quit NexKey**. On Windows a single left-click on the icon also opens the window.

NexKey is single-instance: launching it a second time just opens the existing window.

To quit completely, use the tray menu (the window close button hides the app by default).

## 9. Where the data lives

| OS | Path |
| --- | --- |
| Windows | `%APPDATA%\nexkey\config.json` |
| macOS | `~/Library/Application Support/nexkey/config.json` |

A `config.json.bak` backup is kept next to it, and `nexkey.log` contains diagnostic messages. Uninstalling does not delete the config, so a reinstall keeps all bindings.

## 10. Updates

**Check for updates** (Settings - About, or automatically at startup) compares your version with the latest release at `github.com/official-ids/NbOS-dev/releases`. If a newer version exists, a toast with a link to the Releases page appears. NexKey never downloads or installs anything by itself.

## 11. Troubleshooting

| Problem | Cause and fix |
| --- | --- |
| Hotkey does not work | The combination is taken by another application. Re-record the hotkey. Also check that the binding is enabled and the global pause is off. |
| `!` badge on a card | NexKey could not register that hotkey (busy or invalid). Choose another combination. |
| The app does not start with the system | The setting works for installed builds. If you use the portable version or `npm start`, autostart is not registered. |
| Notification does not appear | Check "Launch notifications" in Settings - Behavior, and system notification permissions. |
| A `.bat` script opens and closes instantly | Run it once manually - if it closes by itself outside NexKey too, the script requires arguments or an admin flag (enable "Run as administrator"). |
| macOS: app does not open | Run `xattr -cr /Applications/NexKey.app` once. |
| Something else | Check `nexkey.log`, then open an issue or write to the contacts below. |

## 12. Uninstall

Windows: uninstall NexKey from "Apps and features". The config folder `%APPDATA%\nexkey` is kept - delete it manually if you want a full wipe.

macOS: move `NexKey.app` to Trash. Remove `~/Library/Application Support/nexkey` for a full wipe. Also remove NexKey from login items if it was enabled.

---

Contacts: Telegram [@nbsp_acc](https://t.me/nbsp_acc) - Email [iamytn@duck.com](mailto:iamytn@duck.com) - 76 School [76school.vercel.app](https://76school.vercel.app)
