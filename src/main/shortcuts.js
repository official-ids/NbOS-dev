'use strict';

/**
 * Global shortcut manager.
 * Wraps Electron globalShortcut, tracks owned accelerators,
 * supports global pause and returns per-binding registration failures.
 */

class ShortcutManager {
  /**
   * @param {Electron.GlobalShortcut} globalShortcut
   * @param {(binding:object)=>void} onTrigger
   * @param {(msg:string)=>void} log
   */
  constructor(globalShortcut, onTrigger, log) {
    this.gs = globalShortcut;
    this.onTrigger = onTrigger;
    this.log = log || (() => {});
    this.owned = new Map(); // id -> accelerator
    this.paused = false;
  }

  /**
   * (Re)register all enabled bindings.
   * @returns {Array<{id:string, hotkey:string, reason:string}>} failures
   */
  syncAll(bindings) {
    this.unregisterAll();
    const failures = [];
    if (this.paused) return failures;
    const taken = new Set();
    for (const b of Array.isArray(bindings) ? bindings : []) {
      if (!b || !b.enabled || !b.hotkey) continue;
      if (taken.has(b.hotkey)) continue; // duplicates handled client-side
      try {
        const ok = this.gs.register(b.hotkey, () => this.onTrigger(b));
        if (ok) {
          this.owned.set(b.id, b.hotkey);
          taken.add(b.hotkey);
        } else {
          failures.push({ id: b.id, hotkey: b.hotkey, reason: 'taken' });
        }
      } catch (e) {
        this.log('Register failed ' + b.hotkey + ': ' + e.message);
        failures.push({ id: b.id, hotkey: b.hotkey, reason: 'invalid' });
      }
    }
    return failures;
  }

  setPaused(p) {
    this.paused = !!p;
    if (this.paused) this.unregisterAll();
  }

  isPaused() { return this.paused; }

  unregisterAll() {
    for (const [, acc] of this.owned) {
      try { this.gs.unregister(acc); } catch (_) { /* noop */ }
    }
    this.owned.clear();
  }
}

module.exports = { ShortcutManager };
