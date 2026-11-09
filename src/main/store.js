'use strict';

/**
 * NexKey config store.
 * Pure Node module (no Electron imports) so it can be unit-tested standalone.
 * Atomic saves + automatic .bak backup + corruption recovery.
 */

const fs = require('fs');

const APP_VERSION = '1.0.0';

const DEFAULT_SETTINGS = {
  language: 'en',
  theme: 'black',
  autostart: false,
  startHidden: true,
  closeToTray: true,
  notifications: true,
  autoCheckUpdates: true,
  pausedAll: false,
  firstRunDone: false
};

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(base, patch) {
  const out = isObj(base) ? { ...base } : {};
  if (!isObj(patch)) return out;
  for (const k of Object.keys(patch)) {
    const v = patch[k];
    if (isObj(v) && isObj(base && base[k])) out[k] = deepMerge(base[k], v);
    else if (v !== undefined) out[k] = isObj(v) ? { ...v } : v;
  }
  return out;
}

function clampStr(v, max) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

function sanitizeBinding(b) {
  if (!isObj(b)) b = {};
  const id = clampStr(b.id, 64).replace(/[^\w:-]/g, '') ||
    'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return {
    id,
    name: clampStr(b.name, 80),
    type: ['app', 'site', 'file'].includes(b.type) ? b.type : 'app',
    target: clampStr(b.target, 2048),
    args: clampStr(b.args, 512),
    elevated: !!b.elevated,
    hotkey: clampStr(b.hotkey, 64),
    enabled: b.enabled !== false,
    runs: Number.isFinite(b.runs) ? Math.max(0, Math.floor(b.runs)) : 0,
    lastRun: Number.isFinite(b.lastRun) ? b.lastRun : null,
    createdAt: Number.isFinite(b.createdAt) ? b.createdAt : Date.now()
  };
}

class Store {
  constructor(file, log) {
    this.file = file;
    this.log = log || (() => {});
    this.data = this.load();
  }

  load() {
    const defaults = () => ({
      version: APP_VERSION,
      settings: { ...DEFAULT_SETTINGS },
      bindings: []
    });
    try {
      if (fs.existsSync(this.file)) {
        const raw = fs.readFileSync(this.file, 'utf8');
        const parsed = JSON.parse(raw);
        const data = defaults();
        data.settings = deepMerge(data.settings, isObj(parsed.settings) ? parsed.settings : {});
        data.bindings = Array.isArray(parsed.bindings)
          ? parsed.bindings.filter((b) => isObj(b)).map(sanitizeBinding)
          : [];
        return data;
      }
    } catch (e) {
      this.log('Config load failed: ' + e.message);
      try { fs.copyFileSync(this.file, this.file + '.corrupt'); } catch (_) { /* noop */ }
    }
    return defaults();
  }

  save() {
    try {
      if (fs.existsSync(this.file)) {
        try { fs.copyFileSync(this.file, this.file + '.bak'); } catch (_) { /* noop */ }
      }
      const tmp = this.file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
      fs.renameSync(tmp, this.file);
      return true;
    } catch (e) {
      this.log('Config save failed: ' + e.message);
      return false;
    }
  }

  get settings() { return this.data.settings; }
  get bindings() { return this.data.bindings; }

  setSettings(patch) {
    this.data.settings = deepMerge(this.data.settings, isObj(patch) ? patch : {});
    this.save();
    return this.data.settings;
  }

  setBindings(list) {
    this.data.bindings = (Array.isArray(list) ? list : []).map(sanitizeBinding);
    this.save();
    return this.data.bindings;
  }

  bumpRun(id) {
    const b = this.data.bindings.find((x) => x.id === id);
    if (b) {
      b.runs = (b.runs || 0) + 1;
      b.lastRun = Date.now();
      this.save();
    }
  }

  resetStats() {
    for (const b of this.data.bindings) {
      b.runs = 0;
      b.lastRun = null;
    }
    this.save();
  }

  reset() {
    this.data = { version: APP_VERSION, settings: { ...DEFAULT_SETTINGS }, bindings: [] };
    this.save();
    return this.data;
  }
}

module.exports = { Store, DEFAULT_SETTINGS, sanitizeBinding, deepMerge, APP_VERSION };
