'use strict';

/**
 * NexKey renderer logic.
 * Vanilla JS, no frameworks. Talks to the main process through
 * window.nexkey (preload). Without the bridge it runs in demo mode
 * (browser preview / screenshots) with data stored in localStorage.
 */

const DEMO = typeof window.nexkey === 'undefined' || window.nexkey === null;
const LS_KEY = 'nexkey-demo-state-v1';

let state = null;
let ui = { view: 'bindings', filter: 'all', search: '' };
let conflicts = new Set();
let invalidHotkeys = new Set();

/* form state */
let editingId = null;
let recAccel = '';
let recording = false;
let heldMods = new Set();

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

/* ================================================== helpers */

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function icon(name) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('class', 'ic');
  const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  u.setAttribute('href', '#' + name);
  s.appendChild(u);
  return s;
}

function uid() {
  return 'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function relTime(ts) {
  if (!ts) return I18N.t('time.never');
  const d = Date.now() - ts;
  if (d < 60000) return I18N.t('time.now');
  if (d < 3600000) return I18N.t('time.min', { n: Math.floor(d / 60000) });
  if (d < 86400000) return I18N.t('time.hour', { n: Math.floor(d / 3600000) });
  return I18N.t('time.day', { n: Math.floor(d / 86400000) });
}

function normalizeSite(raw) {
  let u = String(raw || '').trim().replace(/\s+/g, '');
  if (!u) return false;
  if (/^https?:\/\//i.test(u)) return u;
  if (/^localhost(:\d+)?(\/|$)/i.test(u)) return 'http://' + u;
  if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/i.test(u)) return 'https://' + u;
  return false;
}

const TYPE_ICON = { app: 'i-app', site: 'i-globe', file: 'i-folder' };

function accelParts(accel) {
  if (!accel) return [];
  return String(accel).split('+').filter(Boolean);
}

function modLabel(part) {
  const map = { Control: 'Ctrl', Alt: 'Alt', Shift: 'Shift', Super: (state && state.meta && state.meta.platform === 'darwin') ? 'Cmd' : 'Win' };
  return map[part] || part;
}

function keycap(text) {
  const k = el('span', 'keycap', text);
  return k;
}

function renderKeycaps(container, accel) {
  container.innerHTML = '';
  const parts = accelParts(accel);
  if (!parts.length) {
    container.appendChild(el('span', 'none', I18N.t('form.notSet')));
    return;
  }
  for (const p of parts) container.appendChild(keycap(modLabel(p)));
}

/* ================================================== demo mode */

const DEMO_DATA = () => ({
  settings: {
    language: 'en', theme: 'black', autostart: true, startHidden: true,
    closeToTray: true, notifications: true, autoCheckUpdates: true,
    pausedAll: false, firstRunDone: true
  },
  bindings: [
    { id: 'demo1', name: 'Zapret launcher', type: 'app', target: 'C:\\Tools\\zapret\\general.bat', args: '', elevated: true, hotkey: 'Control+Alt+Z', enabled: true, runs: 128, lastRun: Date.now() - 4 * 60000, createdAt: Date.now() - 30 * 86400000 },
    { id: 'demo2', name: 'YouTube', type: 'site', target: 'youtube.com', args: '', elevated: false, hotkey: 'Control+Alt+Y', enabled: true, runs: 47, lastRun: Date.now() - 3 * 3600000, createdAt: Date.now() - 20 * 86400000 },
    { id: 'demo3', name: 'Notes folder', type: 'file', target: 'C:\\Users\\me\\Documents\\Notes', args: '', elevated: false, hotkey: 'Control+Alt+N', enabled: false, runs: 12, lastRun: null, createdAt: Date.now() - 8 * 86400000 },
    { id: 'demo4', name: 'Telegram', type: 'app', target: 'C:\\Users\\me\\AppData\\Roaming\\Telegram Desktop\\Telegram.exe', args: '', elevated: false, hotkey: 'Control+Alt+T', enabled: true, runs: 31, lastRun: Date.now() - 26 * 3600000, createdAt: Date.now() - 5 * 86400000 }
  ],
  meta: { version: '1.0.0', platform: 'win32' }
});

function loadDemo() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.settings && Array.isArray(d.bindings)) return d;
    }
  } catch (_) { /* noop */ }
  return DEMO_DATA();
}

function saveDemo() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (_) { /* noop */ }
}

/* ================================================== persistence */

async function persistBindings(list) {
  if (DEMO) {
    state.bindings = list;
    saveDemo();
    conflicts = new Set();
    invalidHotkeys = new Set();
    renderBindings();
    return { ok: true, conflicts: [], invalid: [] };
  }
  const res = await window.nexkey.saveBindings(list);
  if (res && res.ok) {
    state.bindings = res.bindings;
    conflicts = new Set(res.conflicts || []);
    invalidHotkeys = new Set(res.invalid || []);
    renderBindings();
    for (const id of conflicts) {
      const b = state.bindings.find((x) => x.id === id);
      if (b) toast('error', I18N.t('toast.conflict', { hotkey: b.hotkey }));
    }
    for (const id of invalidHotkeys) {
      const b = state.bindings.find((x) => x.id === id);
      if (b) toast('error', I18N.t('toast.invalidHotkey', { hotkey: b.hotkey }));
    }
  }
  return res;
}

async function persistSettings(patch) {
  if (DEMO) {
    state.settings = Object.assign({}, state.settings, patch);
    saveDemo();
    return;
  }
  const res = await window.nexkey.saveSettings(patch);
  if (res && res.ok) state.settings = res.settings;
}

/* ================================================== toasts */

function toast(type, text, url) {
  const box = $('#toasts');
  const t = el('div', 'toast toast-' + (type || 'info'));
  t.appendChild(icon(type === 'success' ? 'i-check' : type === 'error' ? 'i-alert' : 'i-info'));
  const body = el('div', 'toast-body');
  body.appendChild(el('span', undefined, text));
  if (url) {
    const link = el('button', 'toast-link');
    link.appendChild(el('span', undefined, 'Open'));
    link.appendChild(icon('i-external'));
    link.addEventListener('click', () => openUrl(url));
    body.appendChild(link);
  }
  t.appendChild(body);
  box.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 260);
  }, 4200);
}

function openUrl(url) {
  if (DEMO) { toast('info', url); return; }
  window.nexkey.openExternal(url);
}

/* ================================================== theme & language */

function applyTheme(theme) {
  document.body.dataset.theme = theme === 'white' ? 'white' : 'black';
  $$('#set-theme button').forEach((b) => b.classList.toggle('active', b.dataset.theme === document.body.dataset.theme));
}

function applyLanguage() {
  I18N.set(state.settings.language || 'en');
  I18N.apply(document);
  $$('#set-lang button').forEach((b) => b.classList.toggle('active', b.dataset.lang === I18N.lang));
  renderBindings();
  renderSettingsSwitches();
  renderRecChips();
}

/* ================================================== bindings view */

function visibleBindings() {
  const q = ui.search.trim().toLowerCase();
  return state.bindings.filter((b) => {
    if (ui.filter !== 'all' && b.type !== ui.filter) return false;
    if (!q) return true;
    return (b.name + ' ' + b.target + ' ' + b.hotkey).toLowerCase().includes(q);
  });
}

function renderBindings() {
  const list = $('#binding-list');
  list.innerHTML = '';

  const all = state.bindings;
  const active = all.filter((b) => b.enabled).length;
  $('#stat-line').textContent = I18N.t('view.stats', { a: active, t: all.length });

  $('#paused-banner').hidden = !state.settings.pausedAll;

  const shown = visibleBindings();
  $('#empty-state').hidden = shown.length !== 0;

  shown.forEach((b, i) => list.appendChild(buildCard(b, i)));
}

function buildCard(b, index) {
  const card = el('div', 'card');
  card.style.animationDelay = Math.min(index * 0.035, 0.3) + 's';
  if (!b.enabled) card.classList.add('disabled');
  if (conflicts.has(b.id) || invalidHotkeys.has(b.id)) card.classList.add('conflict');

  /* icon */
  const ic = el('div', 'card-icon');
  ic.appendChild(icon(TYPE_ICON[b.type] || 'i-app'));
  card.appendChild(ic);

  /* main info */
  const main = el('div', 'card-main');
  const nameRow = el('div', 'card-name-row');
  nameRow.appendChild(el('span', 'card-name', b.name || '...'));
  if (!b.enabled) nameRow.appendChild(el('span', 'flag', I18N.t('card.inactive')));
  if (conflicts.has(b.id) || invalidHotkeys.has(b.id)) nameRow.appendChild(el('span', 'flag flag-alert', '!'));
  main.appendChild(nameRow);
  main.appendChild(el('div', 'card-target', b.target || ''));
  const meta = el('div', 'card-meta');
  meta.textContent = I18N.t('card.runs') + ': ' + (b.runs || 0) + '  ·  ' + I18N.t('card.last') + ' ' + relTime(b.lastRun);
  main.appendChild(meta);
  card.appendChild(main);

  /* hotkey chips */
  const hk = el('div', 'card-hotkey');
  const parts = accelParts(b.hotkey);
  if (parts.length) for (const p of parts) hk.appendChild(keycap(modLabel(p)));
  else hk.appendChild(el('span', 'flag', I18N.t('form.notSet')));
  card.appendChild(hk);

  /* actions */
  const act = el('div', 'card-actions');

  const sw = el('button', 'switch' + (b.enabled ? ' on' : ''));
  sw.setAttribute('role', 'switch');
  sw.setAttribute('aria-checked', String(b.enabled));
  sw.title = I18N.t(b.enabled ? 'nav.active' : 'card.inactive');
  sw.appendChild(el('span', 'knob'));
  sw.addEventListener('click', async () => {
    b.enabled = !b.enabled;
    await persistBindings(state.bindings);
  });
  act.appendChild(sw);

  const run = el('button', 'icon-btn');
  run.title = I18N.t('btn.run');
  run.appendChild(icon('i-play'));
  run.addEventListener('click', async () => {
    if (DEMO) { toast('success', I18N.t('toast.runOk', { name: b.name })); return; }
    const res = await window.nexkey.runBinding(b);
    if (res && res.ok) {
      b.runs = (b.runs || 0) + 1;
      b.lastRun = Date.now();
      renderBindings();
      toast('success', I18N.t('toast.runOk', { name: b.name }));
    } else {
      const reason = res && res.error ? I18N.t('errors.' + res.error) || I18N.t('errors.default') : I18N.t('errors.default');
      toast('error', I18N.t('toast.runFail', { reason }));
    }
  });
  act.appendChild(run);

  const edit = el('button', 'icon-btn');
  edit.title = I18N.t('btn.edit');
  edit.appendChild(icon('i-edit'));
  edit.addEventListener('click', () => openBindingModal(b));
  act.appendChild(edit);

  const up = el('button', 'icon-btn');
  up.title = I18N.t('btn.up');
  up.appendChild(icon('i-up'));
  up.addEventListener('click', () => moveBinding(b.id, -1));
  act.appendChild(up);

  const down = el('button', 'icon-btn');
  down.title = I18N.t('btn.down');
  down.appendChild(icon('i-down'));
  down.addEventListener('click', () => moveBinding(b.id, 1));
  act.appendChild(down);

  const del = el('button', 'icon-btn');
  del.title = I18N.t('btn.del');
  del.appendChild(icon('i-trash'));
  del.addEventListener('click', () => {
    confirmDialog({
      title: I18N.t('confirm.deleteTitle'),
      text: I18N.t('confirm.deleteText', { name: b.name }),
      yes: I18N.t('confirm.deleteYes'),
      onYes: async () => {
        await persistBindings(state.bindings.filter((x) => x.id !== b.id));
        toast('info', I18N.t('toast.deleted'));
      }
    });
  });
  act.appendChild(del);

  card.appendChild(act);
  return card;
}

async function moveBinding(id, dir) {
  const idx = state.bindings.findIndex((x) => x.id === id);
  const next = idx + dir;
  if (idx < 0 || next < 0 || next >= state.bindings.length) return;
  const list = state.bindings.slice();
  const tmp = list[idx];
  list[idx] = list[next];
  list[next] = tmp;
  await persistBindings(list);
}

/* ================================================== binding modal */

function openBindingModal(binding) {
  editingId = binding ? binding.id : null;
  recAccel = binding ? binding.hotkey || '' : '';
  recording = false;
  heldMods.clear();
  conflicts.delete(editingId || '');

  $('#bm-title').textContent = I18N.t(editingId ? 'modal.editTitle' : 'modal.addTitle');
  $('#f-name').value = binding ? binding.name : '';
  $('#f-target').value = binding ? binding.target : '';
  $('#f-args').value = binding ? binding.args : '';
  $('#f-elevated').checked = binding ? !!binding.elevated : false;
  setFormType(binding ? binding.type : 'app');
  renderRecChips();
  updateRecState();

  openModal('modal-binding');
  setTimeout(() => $('#f-name').focus(), 160);
}

function setFormType(type) {
  $$('#f-type button').forEach((b) => b.classList.toggle('active', b.dataset.type === type));
  $('#f-type').dataset.current = type;
  const isApp = type === 'app';
  const isSite = type === 'site';
  $('#f-args-row').hidden = !isApp;
  $('#f-elevated-row').hidden = !isApp;
  $('#f-browse').hidden = isSite;
  const ph = isApp ? 'form.targetAppPh' : isSite ? 'form.targetSitePh' : 'form.targetFilePh';
  $('#f-target').placeholder = I18N.t(ph);
  $('#f-target-label').textContent = isSite ? I18N.t('form.target') + ' (URL)' : I18N.t('form.target');
}

function updateRecState() {
  $('#f-recorder').classList.toggle('recording', recording);
  renderRecChips();
}

function renderRecChips() {
  const chips = $('#rec-chips');
  if (!chips) return;
  if (recording) {
    chips.innerHTML = '';
    if (heldMods.size) {
      const order = ['Control', 'Alt', 'Shift', 'Super'];
      for (const m of order) if (heldMods.has(m)) chips.appendChild(keycap(modLabel(m)));
    } else {
      chips.appendChild(el('span', 'none', I18N.t('form.press')));
    }
    return;
  }
  renderKeycaps(chips, recAccel);
}

function accelFromEvent(e) {
  const mods = [];
  if (e.ctrlKey) mods.push('Control');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (e.metaKey) mods.push('Super');
  const code = e.code || '';
  let key = null;
  if (/^Key[A-Z]$/.test(code)) key = code.slice(3);
  else if (/^Digit\d$/.test(code)) key = code.slice(5);
  else if (/^F\d{1,2}$/.test(code)) key = code;
  else if (code === 'Space') key = 'Space';
  else if (code === 'ArrowUp') key = 'Up';
  else if (code === 'ArrowDown') key = 'Down';
  else if (code === 'ArrowLeft') key = 'Left';
  else if (code === 'ArrowRight') key = 'Right';
  else if (code === 'Backquote') key = '`';
  else if (code === 'Minus') key = '-';
  else if (code === 'Equal') key = '=';
  else if (code === 'BracketLeft') key = '[';
  else if (code === 'BracketRight') key = ']';
  else if (code === 'Backslash') key = '\\';
  else if (code === 'Semicolon') key = ';';
  else if (code === 'Quote') key = "'";
  else if (code === 'Comma') key = ',';
  else if (code === 'Period') key = '.';
  else if (code === 'Slash') key = '/';
  else if (['Home', 'End', 'PageUp', 'PageDown', 'Insert', 'Delete'].includes(code)) key = code;
  if (!key) return { ok: false };
  return { ok: true, accel: mods.concat(key).join('+'), hasMod: mods.length > 0 };
}

function recorderKeydown(e) {
  e.preventDefault();
  e.stopPropagation();
  const MOD_KEYS = { Control: 'Control', Alt: 'Alt', Shift: 'Shift', Meta: 'Super' };
  if (e.key === 'Escape') {
    recording = false;
    heldMods.clear();
    updateRecState();
    return;
  }
  if (e.key === 'Backspace') {
    recAccel = '';
    heldMods.clear();
    renderRecChips();
    return;
  }
  if (MOD_KEYS[e.key]) {
    heldMods.add(MOD_KEYS[e.key]);
    renderRecChips();
    return;
  }
  const res = accelFromEvent(e);
  if (!res.ok) {
    $('#f-rec-err').hidden = false;
    setTimeout(() => { $('#f-rec-err').hidden = true; }, 1600);
    return;
  }
  recAccel = res.accel;
  recording = false;
  heldMods.clear();
  updateRecState();
  $('#f-rec-warn').hidden = res.hasMod;
}

function collectForm() {
  const type = $('#f-type').dataset.current || 'app';
  const name = $('#f-name').value.trim();
  const target = $('#f-target').value.trim();
  const args = $('#f-args').value.trim();
  const elevated = $('#f-elevated').checked;
  return { name, type, target, args, elevated, hotkey: recAccel };
}

function validateForm(f, list) {
  if (!f.name) return I18N.t('form.needName');
  if (!f.target) return I18N.t('form.needTarget');
  if (f.type === 'site' && !normalizeSite(f.target)) return I18N.t('form.badUrl');
  if (!f.hotkey) return I18N.t('form.needHotkey');
  const dup = list.find((x) => x.id !== editingId && (x.hotkey || '').toLowerCase() === f.hotkey.toLowerCase());
  if (dup) return I18N.t('form.dup');
  return null;
}

async function saveBinding() {
  const f = collectForm();
  const err = validateForm(f, state.bindings);
  if (err) { toast('error', err); return; }

  const list = state.bindings.slice();
  if (editingId) {
    const idx = list.findIndex((x) => x.id === editingId);
    if (idx >= 0) {
      list[idx] = Object.assign({}, list[idx], f);
    }
  } else {
    list.unshift(Object.assign({
      id: uid(), enabled: true, runs: 0, lastRun: null, createdAt: Date.now()
    }, f));
  }
  const res = await persistBindings(list);
  if (res && res.ok) {
    closeModal();
    toast('success', I18N.t('toast.saved'));
  }
}

async function testBinding() {
  const f = collectForm();
  if (!f.target) { toast('error', I18N.t('form.needTarget')); return; }
  if (DEMO) { toast('info', I18N.t('toast.pickDisabled')); return; }
  const res = await window.nexkey.runBinding(Object.assign({ id: 'test', name: f.name || 'test' }, f));
  if (res && res.ok) toast('success', I18N.t('toast.runOk', { name: f.name || f.target }));
  else toast('error', I18N.t('toast.runFail', { reason: f.target }));
}

/* ================================================== overlay / modals */

function openModal(id) {
  $$('.modal').forEach((m) => { m.hidden = m.id !== id; });
  const ov = $('#overlay');
  ov.hidden = false;
  requestAnimationFrame(() => ov.classList.add('show'));
}

function closeModal() {
  const ov = $('#overlay');
  ov.classList.remove('show');
  setTimeout(() => {
    ov.hidden = true;
    $$('.modal').forEach((m) => { m.hidden = true; });
  }, 210);
  recording = false;
  heldMods.clear();
}

let confirmCb = null;

function confirmDialog(opts) {
  $('#cf-title').textContent = opts.title;
  $('#cf-text').textContent = opts.text;
  $('#cf-yes').textContent = opts.yes || I18N.t('confirm.yes');
  $('#cf-yes').classList.toggle('btn-danger', !!opts.danger);
  confirmCb = opts.onYes;
  openModal('modal-confirm');
}

/* ================================================== settings view */

function renderSettingsSwitches() {
  const s = state.settings;
  const map = [['#set-autostart', s.autostart], ['#set-hidden', s.startHidden], ['#set-closetray', s.closeToTray], ['#set-notif', s.notifications], ['#set-autoupd', s.autoCheckUpdates]];
  for (const [sel, val] of map) {
    const b = $(sel);
    if (!b) continue;
    b.classList.toggle('on', !!val);
    b.setAttribute('aria-checked', String(!!val));
  }
  $$('#set-theme button').forEach((b) => b.classList.toggle('active', b.dataset.theme === document.body.dataset.theme));
  $$('#set-lang button').forEach((b) => b.classList.toggle('active', b.dataset.lang === I18N.lang));
}

function wireSettings() {
  $$('#set-lang button').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.lang === I18N.lang) return;
    state.settings.language = b.dataset.lang;
    persistSettings({ language: b.dataset.lang });
    applyLanguage();
    toast('success', b.dataset.lang === 'ru' ? 'Русский язык включён' : 'Language switched to English');
  }));

  $$('#set-theme button').forEach((b) => b.addEventListener('click', () => {
    applyTheme(b.dataset.theme);
    persistSettings({ theme: b.dataset.theme });
  }));

  const switchMap = [
    ['#set-autostart', 'autostart'],
    ['#set-hidden', 'startHidden'],
    ['#set-closetray', 'closeToTray'],
    ['#set-notif', 'notifications'],
    ['#set-autoupd', 'autoCheckUpdates']
  ];
  for (const [sel, key] of switchMap) {
    $(sel).addEventListener('click', async () => {
      const val = !state.settings[key];
      state.settings[key] = val;
      await persistSettings({ [key]: val });
      renderSettingsSwitches();
    });
  }

  $('#set-export').addEventListener('click', async () => {
    if (DEMO) { toast('info', I18N.t('toast.pickDisabled')); return; }
    const res = await window.nexkey.exportConfig();
    if (res && res.ok) toast('success', I18N.t('toast.exported'));
  });

  $('#set-import').addEventListener('click', async () => {
    if (DEMO) { toast('info', I18N.t('toast.pickDisabled')); return; }
    const res = await window.nexkey.importConfig();
    if (res && res.ok) {
      state.settings = res.settings;
      conflicts = new Set();
      invalidHotkeys = new Set();
      applyTheme(state.settings.theme);
      applyLanguage();
      renderSettingsSwitches();
      toast('success', I18N.t('toast.imported', { n: res.count }));
    } else if (res && res.error === 'invalid_file') {
      toast('error', I18N.t('toast.importFail'));
    }
  });

  $('#set-resetstats').addEventListener('click', () => {
    confirmDialog({
      title: I18N.t('confirm.resetStatsTitle'),
      text: I18N.t('confirm.resetStatsText'),
      onYes: async () => {
        if (DEMO) {
          state.bindings.forEach((b) => { b.runs = 0; b.lastRun = null; });
          saveDemo();
          renderBindings();
        } else {
          const res = await window.nexkey.resetStats();
          if (res && res.ok) { state.bindings = res.bindings; renderBindings(); }
        }
        toast('info', I18N.t('toast.resetStats'));
      }
    });
  });

  $('#set-resetall').addEventListener('click', () => {
    confirmDialog({
      title: I18N.t('confirm.resetAllTitle'),
      text: I18N.t('confirm.resetAllText'),
      yes: I18N.t('confirm.resetAllYes'),
      danger: true,
      onYes: async () => {
        if (DEMO) {
          state = DEMO_DATA();
          saveDemo();
        } else {
          const res = await window.nexkey.resetAll();
          if (res && res.ok) {
            state.settings = res.settings;
            state.bindings = res.bindings;
          }
        }
        conflicts = new Set();
        invalidHotkeys = new Set();
        applyTheme(state.settings.theme);
        applyLanguage();
        renderSettingsSwitches();
        updatePauseUI();
        toast('info', I18N.t('toast.resetAll'));
      }
    });
  });

  $('#set-checkupd').addEventListener('click', checkUpdates);
}

async function checkUpdates() {
  if (DEMO) { toast('info', I18N.t('toast.upToDate')); return; }
  const res = await window.nexkey.checkUpdates();
  if (!res || !res.ok) { toast('error', I18N.t('toast.updateFail')); return; }
  if (res.hasUpdate) toast('info', I18N.t('toast.updated', { v: res.latest }), res.url);
  else toast('success', I18N.t('toast.upToDate'));
}

/* ================================================== pause / status */

function updatePauseUI() {
  const paused = !!(state.settings && state.settings.pausedAll);
  const sw = $('#pause-switch');
  sw.classList.toggle('on', !paused);
  sw.setAttribute('aria-checked', String(!paused));
  const chip = $('#status-chip');
  chip.classList.toggle('paused', paused);
  chip.classList.toggle('on', !paused);
  $('#status-text').textContent = I18N.t(paused ? 'nav.paused' : 'nav.active');
}

/* ================================================== navigation */

function switchView(view) {
  ui.view = view;
  $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + view));
  if (view === 'bindings') renderBindings();
}

/* ================================================== static wiring */

function bindStatic() {
  $$('.nav-item').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.view)));

  $('#btn-add').addEventListener('click', () => openBindingModal(null));
  $('#btn-empty-add').addEventListener('click', () => openBindingModal(null));

  $('#search').addEventListener('input', (e) => {
    ui.search = e.target.value;
    renderBindings();
  });

  $$('#filters .chip').forEach((c) => c.addEventListener('click', () => {
    ui.filter = c.dataset.filter;
    $$('#filters .chip').forEach((x) => x.classList.toggle('active', x === c));
    renderBindings();
  }));

  /* pause switch */
  $('#pause-switch').addEventListener('click', async () => {
    const val = !state.settings.pausedAll;
    state.settings.pausedAll = val;
    await persistSettings({ pausedAll: val });
    updatePauseUI();
    renderBindings();
  });

  /* titlebar */
  $('#tb-min').addEventListener('click', () => { if (!DEMO) window.nexkey.win.minimize(); });
  $('#tb-max').addEventListener('click', () => { if (!DEMO) window.nexkey.win.maximize(); });
  $('#tb-close').addEventListener('click', () => { if (!DEMO) window.nexkey.win.close(); });
  $('#titlebar').addEventListener('dblclick', (e) => {
    if (e.target.closest('.tb-btn')) return;
    if (!DEMO) window.nexkey.win.maximize();
  });

  /* modal: binding */
  $('#f-type').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) setFormType(b.dataset.type);
  });
  $('#f-browse').addEventListener('click', async () => {
    const type = $('#f-type').dataset.current;
    if (type === 'site') return;
    if (DEMO) { toast('info', I18N.t('toast.pickDisabled')); return; }
    const res = await window.nexkey.pickTarget(type);
    if (res && res.ok && res.path) $('#f-target').value = res.path;
  });
  $('#f-recorder').addEventListener('click', () => {
    recording = !recording;
    heldMods.clear();
    $('#f-rec-warn').hidden = true;
    if (recording) $('#f-recorder').focus();
    updateRecState();
  });
  $('#f-recorder').addEventListener('keydown', (e) => {
    if (recording) recorderKeydown(e);
  });
  $('#f-recorder').addEventListener('blur', () => {
    if (recording) { recording = false; heldMods.clear(); updateRecState(); }
  });
  $('#f-save').addEventListener('click', saveBinding);
  $('#f-cancel').addEventListener('click', closeModal);
  $('#bm-close').addEventListener('click', closeModal);
  $('#f-test').addEventListener('click', testBinding);

  /* modal: confirm */
  $('#cf-yes').addEventListener('click', () => { closeModal(); if (confirmCb) { const cb = confirmCb; confirmCb = null; cb(); } });
  $('#cf-cancel').addEventListener('click', closeModal);
  $('#cf-x').addEventListener('click', closeModal);

  /* modal: welcome */
  $('#welcome-done').addEventListener('click', () => {
    persistSettings({ firstRunDone: true });
    closeModal();
  });

  /* about links */
  $$('.link').forEach((l) => l.addEventListener('click', () => openUrl(l.dataset.url)));

  /* overlay backdrop click */
  $('#overlay').addEventListener('mousedown', (e) => {
    if (e.target === $('#overlay')) closeModal();
  });

  /* global keys */
  document.addEventListener('keydown', (e) => {
    if (recording) return;
    if (e.key === 'Escape' && !$('#overlay').hidden) { closeModal(); return; }
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    const inField = tag === 'input' || tag === 'textarea' || tag === 'select';
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyN' && !inField && $('#overlay').hidden) {
      e.preventDefault();
      openBindingModal(null);
    }
    if (e.key === '/' && !inField && $('#overlay').hidden && ui.view === 'bindings') {
      e.preventDefault();
      $('#search').focus();
    }
  });

  /* ripple effect on buttons */
  document.addEventListener('mousedown', (e) => {
    const btn = e.target.closest('.btn-solid, .btn-ghost, .nav-item');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const d = Math.max(r.width, r.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = d + 'px';
    ripple.style.left = (e.clientX - r.left - d / 2) + 'px';
    ripple.style.top = (e.clientY - r.top - d / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });

  wireSettings();
}

/* ================================================== boot */

function updateVerLabel() {
  const v = state.meta && state.meta.version ? state.meta.version : '1.0.0';
  $('#ver-label').textContent = 'v' + v;
  $('#about-ver').textContent = 'v' + v;
}

async function boot() {
  bindStatic();

  if (DEMO) {
    state = loadDemo();
    window.__demo = {
      setLang(lang) { state.settings.language = lang; saveDemo(); applyLanguage(); },
      setTheme(theme) { state.settings.theme = theme; saveDemo(); applyTheme(theme); },
      openAdd() { openBindingModal(null); },
      setRecorder(accel) { recAccel = accel; renderRecChips(); },
      openSettings() { switchView('settings'); },
      state: () => state
    };
  } else {
    const res = await window.nexkey.getState();
    state = { settings: res.settings, bindings: res.bindings, meta: res.meta };
    window.nexkey.onToast((d) => toast(d.type || 'info', d.text, d.url));
    window.nexkey.onStateChanged((d) => {
      if (d && d.settings) {
        state.settings = d.settings;
        updatePauseUI();
        renderBindings();
        renderSettingsSwitches();
      }
    });
    window.nexkey.onBindingRun((d) => {
      const b = state.bindings.find((x) => x.id === d.id);
      if (b) { b.runs = (b.runs || 0) + 1; b.lastRun = Date.now(); renderBindings(); }
    });
  }

  applyTheme(state.settings.theme);
  applyLanguage();
  updateVerLabel();
  updatePauseUI();
  renderBindings();

  if (!state.settings.firstRunDone) openModal('modal-welcome');

  $('#app').classList.add('ready');
}

document.addEventListener('DOMContentLoaded', boot);
