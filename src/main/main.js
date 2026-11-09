'use strict';

/**
 * NexKey - main process.
 * Frameless window, tray, global hotkeys, autostart, single instance,
 * config store, update checker. Built by NsOS Dev x 76 School.
 */

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  globalShortcut,
  dialog,
  shell,
  nativeImage,
  Notification
} = require('electron');
const path = require('path');
const fs = require('fs');

const { Store, APP_VERSION } = require('./store');
const { ShortcutManager } = require('./shortcuts');
const { runBinding } = require('./launcher');
const autostart = require('./autostart');
const updater = require('./updater');

const IS_MAC = process.platform === 'darwin';
const IS_WIN = process.platform === 'win32';
const SMOKE = process.env.NEXKEY_SMOKE === '1' || process.argv.includes('--smoke-test');
const HIDDEN_ARG = process.argv.includes('--hidden') || process.argv.includes('/hidden');
const ICONS = path.join(__dirname, '../../build');
const REPO_URL = 'https://github.com/official-ids/NbOS-dev';

/* Localized strings used by the main process (tray, notifications). */
const STR = {
  en: {
    open: 'Open NexKey',
    pause: 'Pause all hotkeys',
    resume: 'Resume all hotkeys',
    autostart: 'Start with system',
    quit: 'Quit NexKey',
    launched: 'Launched',
    launchFailed: 'Launch failed',
    conflict: 'Some hotkeys were not registered - they may be in use by another application',
    bgRunning: 'NexKey is running in the background. Hotkeys are active.',
    update: 'Update available: NexKey v'
  },
  ru: {
    open: 'Открыть NexKey',
    pause: 'Приостановить все хоткеи',
    resume: 'Возобновить все хоткеи',
    autostart: 'Запускать вместе с системой',
    quit: 'Выйти из NexKey',
    launched: 'Запущено',
    launchFailed: 'Не удалось запустить',
    conflict: 'Некоторые хоткеи не удалось зарегистрировать - возможно, они заняты другим приложением',
    bgRunning: 'NexKey работает в фоне. Горячие клавиши активны.',
    update: 'Доступно обновление: NexKey v'
  }
};

let win = null;
let tray = null;
let store = null;
let shortcuts = null;
let quitting = false;
let logStream = null;

function log(msg) {
  try {
    if (!logStream) {
      const file = path.join(app.getPath('userData'), 'nexkey.log');
      try {
        const st = fs.statSync(file);
        if (st.size > 200 * 1024) fs.unlinkSync(file); // keep it small
      } catch (_) { /* noop */ }
      logStream = fs.createWriteStream(file, { flags: 'a' });
    }
    logStream.write('[' + new Date().toISOString() + '] ' + msg + '\n');
  } catch (_) { /* noop */ }
}

function t(key) {
  const lang = store && STR[store.settings.language] ? store.settings.language : 'en';
  return STR[lang][key] || STR.en[key] || key;
}

function shellAPI() {
  return {
    openExternal: (url) => shell.openExternal(url),
    openPath: (p) => shell.openPath(p)
  };
}

function notify(title, body) {
  try {
    if (!store || !store.settings.notifications) return;
    if (!Notification.isSupported()) return;
    const n = new Notification({
      title: title || 'NexKey',
      body: body || '',
      icon: path.join(ICONS, 'icon.png'),
      silent: true
    });
    n.on('click', () => showWindow());
    n.show();
  } catch (e) {
    log('Notify failed: ' + e.message);
  }
}

/* ------------------------------------------------ window */

function createWindow() {
  const white = store.settings.theme === 'white';
  win = new BrowserWindow({
    width: 1060,
    height: 720,
    minWidth: 900,
    minHeight: 620,
    show: false,
    frame: false,
    backgroundColor: white ? '#f5f5f5' : '#050505',
    icon: path.join(ICONS, 'icon.png'),
    title: 'NexKey',
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false
    }
  });

  win.loadFile(path.join(__dirname, '../renderer/index.html'));

  win.once('ready-to-show', () => {
    if (SMOKE) {
      console.log('SMOKE_OK');
      setTimeout(() => app.exit(0), 1500);
      return;
    }
    const hidden = store.settings.startHidden || HIDDEN_ARG;
    if (hidden) {
      notify('NexKey', t('bgRunning'));
    } else {
      win.show();
      win.focus();
    }
  });

  win.on('close', (e) => {
    if (!quitting && store.settings.closeToTray && !SMOKE) {
      e.preventDefault();
      win.hide();
    }
  });

  win.on('closed', () => { win = null; });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

function showWindow() {
  if (!win) { createWindow(); return; }
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

/* ------------------------------------------------ tray */

function trayIcon() {
  const p = path.join(IS_WIN ? path.join(ICONS, 'tray.png') : path.join(ICONS, 'tray.png'));
  const img = nativeImage.createFromPath(p);
  return img.isEmpty() ? nativeImage.createFromPath(path.join(ICONS, 'icon.png')) : img;
}

function buildTray() {
  try {
    if (tray) {
      tray.destroy();
      tray = null;
    }
    tray = new Tray(trayIcon());
    tray.setToolTip('NexKey - hotkey launcher');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: t('open'), click: () => showWindow() },
      {
        label: store.settings.pausedAll ? t('resume') : t('pause'),
        click: () => togglePause()
      },
      { type: 'separator' },
      {
        label: t('autostart'),
        type: 'checkbox',
        checked: !!store.settings.autostart,
        click: (item) => {
          store.setSettings({ autostart: item.checked });
          autostart.apply(app, item.checked, store.settings.startHidden, log);
        }
      },
      { type: 'separator' },
      { label: t('quit'), click: () => app.quit() }
    ]));
    if (!IS_MAC) {
      tray.on('click', () => showWindow());
    }
  } catch (e) {
    log('Tray failed: ' + e.message);
  }
}

function togglePause() {
  const paused = !store.settings.pausedAll;
  store.setSettings({ pausedAll: paused });
  shortcuts.setPaused(paused);
  if (!paused) shortcuts.syncAll(store.bindings);
  buildTray();
  if (win && !win.isDestroyed()) {
    win.webContents.send('ui:state-changed', { settings: store.settings });
  }
}

/* ------------------------------------------------ IPC */

function registerIpc() {
  const wrap = (fn) => async (e, ...args) => {
    try { return await fn(...args); }
    catch (err) { log('IPC error: ' + err.message); return { ok: false, error: err.message }; }
  };

  ipcMain.handle('state:get', wrap(() => ({
    ok: true,
    settings: store.settings,
    bindings: store.bindings,
    meta: {
      version: APP_VERSION,
      platform: process.platform,
      repo: REPO_URL,
      site: 'https://76school.vercel.app'
    }
  })));

  ipcMain.handle('bindings:save', wrap((list) => {
    const bindings = store.setBindings(list);
    const failures = shortcuts.syncAll(bindings);
    return {
      ok: true,
      bindings,
      conflicts: failures.filter((f) => f.reason === 'taken').map((f) => f.id),
      invalid: failures.filter((f) => f.reason === 'invalid').map((f) => f.id)
    };
  }));

  ipcMain.handle('settings:save', wrap((patch) => {
    const before = { ...store.settings };
    const settings = store.setSettings(patch);
    if (patch && typeof patch.autostart === 'boolean') {
      autostart.apply(app, settings.autostart, settings.startHidden, log);
    }
    if (settings.pausedAll !== before.pausedAll) {
      shortcuts.setPaused(settings.pausedAll);
      if (!settings.pausedAll) shortcuts.syncAll(store.bindings);
    } else if (patch && patch.bindingsResync) {
      shortcuts.syncAll(store.bindings);
    }
    if (settings.theme !== before.theme && win && !win.isDestroyed()) {
      win.setBackgroundColor(settings.theme === 'white' ? '#f5f5f5' : '#050505');
    }
    if (settings.language !== before.language || settings.pausedAll !== before.pausedAll) {
      buildTray();
    }
    if (win && !win.isDestroyed()) {
      win.webContents.send('ui:state-changed', { settings });
    }
    return { ok: true, settings };
  }));

  ipcMain.handle('dialog:pickTarget', wrap(async (kind) => {
    const opts = { properties: ['openFile'], title: 'NexKey' };
    if (kind === 'app') {
      opts.filters = [
        { name: IS_MAC ? 'Applications' : 'Applications & scripts',
          extensions: IS_MAC ? ['app'] : ['exe', 'lnk', 'bat', 'cmd', 'url'] },
        { name: 'All files', extensions: ['*'] }
      ];
      if (IS_MAC) opts.properties.push('openDirectory');
    } else if (kind === 'file') {
      opts.properties = ['openFile', 'openDirectory'];
      opts.filters = [{ name: 'All files', extensions: ['*'] }];
    }
    const r = await dialog.showOpenDialog(win, opts);
    return { ok: true, path: r.canceled ? null : r.filePaths[0] };
  }));

  ipcMain.handle('binding:run', wrap((binding) => {
    if (!binding || !binding.id) return { ok: false, error: 'bad_binding' };
    const res = runBinding(binding, shellAPI(), process.platform);
    if (res.ok) {
      store.bumpRun(binding.id);
      notify('NexKey', t('launched') + ': ' + binding.name);
    } else {
      notify('NexKey', t('launchFailed') + ': ' + binding.name);
    }
    return res;
  }));

  ipcMain.handle('win:minimize', wrap(() => { if (win) win.minimize(); return { ok: true }; }));

  ipcMain.handle('win:maximize', wrap(() => {
    if (!win) return { ok: true };
    if (win.isMaximized()) win.unmaximize(); else win.maximize();
    return { ok: true };
  }));

  ipcMain.handle('win:close', wrap(() => {
    if (win) win.close();
    return { ok: true };
  }));

  ipcMain.handle('config:export', wrap(async () => {
    const r = await dialog.showSaveDialog(win, {
      title: 'NexKey - export',
      defaultPath: 'nexkey-config.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    const payload = {
      app: 'NexKey',
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      settings: store.settings,
      bindings: store.bindings
    };
    fs.writeFileSync(r.filePath, JSON.stringify(payload, null, 2));
    return { ok: true, path: r.filePath };
  }));

  ipcMain.handle('config:import', wrap(async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'NexKey - import',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    });
    if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
    const raw = fs.readFileSync(r.filePaths[0], 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.bindings)) {
      return { ok: false, error: 'invalid_file' };
    }
    store.setSettings(parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {});
    const bindings = store.setBindings(parsed.bindings);
    const settings = store.settings;
    autostart.apply(app, settings.autostart, settings.startHidden, log);
    shortcuts.setPaused(settings.pausedAll);
    shortcuts.syncAll(bindings);
    buildTray();
    if (win && !win.isDestroyed()) {
      win.setBackgroundColor(settings.theme === 'white' ? '#f5f5f5' : '#050505');
    }
    return { ok: true, count: bindings.length, settings };
  }));

  ipcMain.handle('updates:check', wrap(async () => {
    const res = await updater.check(APP_VERSION);
    return { ok: true, ...res, repo: REPO_URL };
  }));

  ipcMain.handle('app:openExternal', wrap((url) => {
    const s = String(url || '');
    if (!/^(https?:\/\/|mailto:)/i.test(s)) return { ok: false, error: 'bad_url' };
    shell.openExternal(s);
    return { ok: true };
  }));

  ipcMain.handle('stats:reset', wrap(() => {
    store.resetStats();
    return { ok: true, bindings: store.bindings };
  }));

  ipcMain.handle('app:resetAll', wrap(() => {
    const data = store.reset();
    shortcuts.setPaused(false);
    shortcuts.syncAll(data.bindings);
    autostart.apply(app, data.settings.autostart, data.settings.startHidden, log);
    buildTray();
    if (win && !win.isDestroyed()) {
      win.setBackgroundColor('#050505');
    }
    return { ok: true, settings: data.settings, bindings: data.bindings };
  }));
}

/* ------------------------------------------------ app lifecycle */

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());

  app.whenReady().then(() => {
    app.setAppUserModelId('dev.nsos.nexkey');
    Menu.setApplicationMenu(null);

    store = new Store(path.join(app.getPath('userData'), 'config.json'), log);
    shortcuts = new ShortcutManager(globalShortcut, onHotkeyTrigger, log);
    shortcuts.setPaused(store.settings.pausedAll);
    registerIpc();
    createWindow();
    buildTray();
    autostart.apply(app, store.settings.autostart, store.settings.startHidden, log);
    shortcuts.syncAll(store.bindings);

    // background-start notice already sent in ready-to-show; keep startup lean
    if (store.settings.autoCheckUpdates && store.settings.firstRunDone && !SMOKE) {
      setTimeout(async () => {
        const res = await updater.check(APP_VERSION);
        if (res.ok && res.hasUpdate && win && !win.isDestroyed()) {
          win.webContents.send('ui:toast', {
            type: 'info',
            text: t('update') + res.latest,
            url: res.url
          });
        }
      }, 6000);
    }

    if (SMOKE) {
      console.log('SMOKE_READY');
    }

    log('NexKey started v' + APP_VERSION + ' (' + process.platform + ')');
  });

  app.on('before-quit', () => { quitting = true; });
  app.on('will-quit', () => { try { shortcuts && shortcuts.unregisterAll(); } catch (_) { /* noop */ } });

  app.on('window-all-closed', () => {
    if (!IS_MAC) app.quit();
  });

  app.on('activate', () => {
    if (!win) createWindow();
    else showWindow();
  });
}

function onHotkeyTrigger(binding) {
  const res = runBinding(binding, shellAPI(), process.platform);
  if (res.ok) {
    store.bumpRun(binding.id);
    notify('NexKey', t('launched') + ': ' + binding.name);
    if (win && !win.isDestroyed()) {
      win.webContents.send('ui:binding-run', { id: binding.id });
    }
  } else {
    notify('NexKey', t('launchFailed') + ': ' + binding.name);
    log('Trigger failed for ' + binding.name + ': ' + (res.error || '?'));
  }
}

process.on('uncaughtException', (e) => {
  try { log('Uncaught: ' + (e && e.stack ? e.stack : e)); } catch (_) { /* noop */ }
});
