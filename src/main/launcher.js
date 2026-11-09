'use strict';

/**
 * NexKey launcher.
 * Starts applications, opens websites and files/folders.
 * Works on Windows (exe / bat / cmd / lnk / anything with a default handler)
 * and macOS (open / open -a). Elevated runs are supported on Windows.
 */

const { spawn } = require('child_process');
const path = require('path');

const ERRORS = {
  invalid_url: 'invalid_url',
  missing_target: 'missing_target'
};

function normalizeSite(raw) {
  let u = String(raw || '').trim();
  if (!u) return null;
  u = u.replace(/\s+/g, '');
  if (/^https?:\/\//i.test(u)) return u;
  if (/^localhost(:\d+)?(\/|$)/i.test(u)) return 'http://' + u;
  if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/i.test(u)) return 'https://' + u;
  return null;
}

function splitArgs(s) {
  const t = String(s || '').trim();
  if (!t) return [];
  return t.match(/(?:[^\s"]+|"[^"]*")+/g).map((x) => x.replace(/^"|"$/g, ''));
}

function psQuote(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}

/**
 * @param {object} binding  {type, target, args, elevated}
 * @param {object} shellAPI {openExternal(url), openPath(p)}
 * @param {string} platform process.platform
 * @returns {{ok:boolean, error?:string}}
 */
function runBinding(binding, shellAPI, platform) {
  const type = binding.type;
  const target = String(binding.target || '').trim();
  try {
    if (type === 'site') {
      const url = normalizeSite(target);
      if (!url) return { ok: false, error: ERRORS.invalid_url };
      shellAPI.openExternal(url);
      return { ok: true };
    }

    if (type === 'file') {
      if (!target) return { ok: false, error: ERRORS.missing_target };
      shellAPI.openPath(target);
      return { ok: true };
    }

    // type === 'app'
    if (!target) return { ok: false, error: ERRORS.missing_target };

    if (platform === 'darwin') {
      const args = splitArgs(binding.args);
      const a = ['open'];
      if (/\.app\/?$/i.test(target)) a.push('-a');
      a.push(target);
      if (args.length) a.push('--args', ...args);
      spawn('open', a, { detached: true, stdio: 'ignore' }).unref();
      return { ok: true };
    }

    // Windows path
    const ext = path.extname(target).toLowerCase();
    const args = splitArgs(binding.args);
    const t0 = Date.now();
    const ms = () => Date.now() - t0;

    if (binding.elevated && ext !== '.lnk') {
      const argStr = args.length
        ? ' -ArgumentList ' + args.map(psQuote).join(',')
        : '';
      const cmd = 'Start-Process -FilePath ' + psQuote(target) + argStr + ' -Verb RunAs';
      spawn('powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', cmd],
        { detached: true, stdio: 'ignore', windowsHide: true }
      ).unref();
      return { ok: true, ms: ms() };
    }

    if (ext === '.exe') {
      const child = spawn(target, args, {
        cwd: path.dirname(target),
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      // A direct spawn can fail on exotic targets (blocked file, broken path) -
      // fall back to the OS shell handler instead of failing silently.
      child.on('error', () => {
        try { shellAPI.openPath(target); } catch (_) { /* noop */ }
      });
      child.unref();
      return { ok: true, ms: ms() };
    }

    if (ext === '.bat' || ext === '.cmd') {
      // Console scripts must get their own console with a live stdin. Running
      // them inline with a closed stdin makes interactive scripts (menus,
      // prompts) stall or skip logic. "start" opens a real console for the
      // script, /min keeps it minimized instead of popping over other windows,
      // and the hidden outer cmd returns instantly - the hotkey never blocks.
      spawn('cmd.exe', ['/c', 'start', '', '/min', target, ...args], {
        cwd: path.dirname(target),
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      }).unref();
      return { ok: true, ms: ms() };
    }

    // .lnk, folders, documents, anything with a default handler
    shellAPI.openPath(target);
    return { ok: true, ms: ms() };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

module.exports = { runBinding, normalizeSite, splitArgs };
