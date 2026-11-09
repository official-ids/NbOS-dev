'use strict';

/**
 * NexKey i18n helper.
 * Locale packs are plain scripts (locales/en.js, locales/ru.js) that
 * populate window.NEXKEY_LOCALES - no fetch needed under file://.
 */

window.NEXKEY_LOCALES = window.NEXKEY_LOCALES || {};

const I18N = {
  lang: 'en',

  set(lang) {
    if (window.NEXKEY_LOCALES[lang]) this.lang = lang;
    document.documentElement.setAttribute('lang', lang);
  },

  t(path, vars) {
    const resolve = (pack) => {
      let node = pack;
      for (const p of path.split('.')) {
        if (node && typeof node === 'object') node = node[p];
        else return undefined;
      }
      return node;
    };
    let s = resolve(window.NEXKEY_LOCALES[this.lang]);
    if (s === undefined) s = resolve(window.NEXKEY_LOCALES.en);
    if (s === undefined) return path;
    if (typeof s !== 'string') return path;
    if (vars) {
      for (const k of Object.keys(vars)) {
        s = s.split('{' + k + '}').join(String(vars[k]));
      }
    }
    return s;
  },

  apply(root) {
    const r = root || document;
    r.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = I18N.t(el.dataset.i18n); });
    r.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = I18N.t(el.dataset.i18nPh); });
    r.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = I18N.t(el.dataset.i18nTitle); });
  }
};
