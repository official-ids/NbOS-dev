'use strict';

/**
 * OS-level autostart (login item).
 * Windows: HKCU Run registry key (managed by Electron).
 * macOS: modern login items via SSMonitorApp / SMAppService (Electron wrapper).
 * Note: effective for packaged (installed) builds.
 */

function apply(app, openAtLogin, startHidden, log) {
  try {
    app.setLoginItemSettings({
      openAtLogin: !!openAtLogin,
      args: startHidden ? ['--hidden'] : []
    });
    return true;
  } catch (e) {
    if (log) log('Autostart apply failed: ' + e.message);
    return false;
  }
}

function status(app) {
  try {
    return app.getLoginItemSettings();
  } catch (_) {
    return { openAtLogin: false };
  }
}

module.exports = { apply, status };
