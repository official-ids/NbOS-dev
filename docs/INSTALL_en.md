# Installing NexKey (English)

Также доступна инструкция на русском: [INSTALL_ru.md](INSTALL_ru.md).

NexKey works on **Windows 10/11** and **macOS 10.15+**. There are three ways to install it.

## Way 1 - ready builds from GitHub Releases (recommended)

1. Go to <https://github.com/official-ids/NbOS-dev/releases>.
2. In the latest release download one file:

| File | What it is |
| --- | --- |
| `NexKey-Setup-1.0.0.exe` | Windows installer (NSIS) |
| `NexKey-1.0.0-portable.exe` | Windows portable, runs without installation |
| `NexKey-1.0.0-arm64.dmg` | macOS, Apple Silicon (M1/M2/M3/M4) |
| `NexKey-1.0.0-x64.dmg` | macOS, Intel |

3. **Windows installer**: run the file, choose the installation folder, finish. A desktop shortcut is created and the app starts right away. Enable "Start with system" in the settings for 24/7 autostart.
4. **Windows portable**: just run the file. It keeps the same config in `%APPDATA%\nexkey`, but the OS login item is not registered by portable builds - start it manually or create a shortcut in the Startup folder (`shell:startup`).
5. **macOS**: open the `.dmg`, drag `NexKey.app` into `Applications`. Because the build is not signed with a paid Apple certificate, run once in a terminal:

   ```bash
   xattr -cr /Applications/NexKey.app
   ```

   Then open the app normally.

## Way 2 - build from source

Requirements: [Node.js](https://nodejs.org) 18+ (Node 20 LTS recommended) and Git.

```bash
# 1. Clone the repository
git clone https://github.com/official-ids/NbOS-dev.git
cd NbOS-dev

# 2. Install dependencies
npm install

# 3. Run in dev mode (optional check)
npm start

# 4. Build the installer for your OS
npm run dist:win    # on Windows -> dist/NexKey-Setup-1.0.0.exe + portable
npm run dist:mac    # on macOS  -> dist/NexKey-1.0.0-<arch>.dmg
```

Notes:

- Building a Windows `.exe` must be done **on Windows**, a `.dmg` - **on macOS**. Cross-compilation is not supported.
- The result lands in the `dist/` folder.
- The build is unsigned. Windows SmartScreen may show a warning for the downloaded installer - press "More info" - "Run anyway". On macOS use the `xattr` command above.

## Way 3 - automatic builds via GitHub Actions

The repository contains a CI workflow (`.github/workflows/build.yml`):

- every pushed tag `v*` starts builds on Windows and macOS runners;
- the finished installers are uploaded to the GitHub Release automatically;
- "Actions" tab also allows a manual run (`workflow_dispatch`) - artifacts appear in the run summary.

This way you always get fresh installers without installing anything locally. For releases to work, the repository must be public or have Actions minutes available.

## After installation - first steps

1. Launch NexKey.
2. If the window did not appear (default "start hidden"), find the tray icon and click it.
3. In **Settings** enable **Start with system**.
4. Create your first binding, for example the zapret launcher:

   - Type: **Application**;
   - Target: `C:\Tools\zapret\general.bat` (your actual path);
   - Run as administrator: on, if the script requires elevation;
   - Hotkey: `Ctrl+Alt+Z`;
   - Save.

Press `Ctrl+Alt+Z` anywhere - the script starts. Reboot the PC and check that the tray icon appears again by itself.

## Updating

NexKey checks GitHub Releases for a newer version (Settings - About - **Check for updates**, or automatically). Download the new installer from the release page and install it over the old one - settings and bindings are kept.

## Uninstalling

- Windows: "Apps and features" - NexKey - Uninstall. The config folder `%APPDATA%\nexkey` is kept; delete it manually for a full wipe.
- macOS: drag `NexKey.app` to Trash and remove `~/Library/Application Support/nexkey` for a full wipe.
