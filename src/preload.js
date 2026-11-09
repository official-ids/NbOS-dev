'use strict';

/**
 * NexKey preload bridge.
 * Exposes a minimal, audited API surface to the renderer.
 * contextIsolation: on, nodeIntegration: off.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexkey', {
  /* state */
  getState: () => ipcRenderer.invoke('state:get'),
  saveBindings: (list) => ipcRenderer.invoke('bindings:save', list),
  saveSettings: (patch) => ipcRenderer.invoke('settings:save', patch),

  /* dialogs */
  pickTarget: (kind) => ipcRenderer.invoke('dialog:pickTarget', kind),
  exportConfig: () => ipcRenderer.invoke('config:export'),
  importConfig: () => ipcRenderer.invoke('config:import'),

  /* actions */
  runBinding: (binding) => ipcRenderer.invoke('binding:run', binding),
  checkUpdates: () => ipcRenderer.invoke('updates:check'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  resetStats: () => ipcRenderer.invoke('stats:reset'),
  resetAll: () => ipcRenderer.invoke('app:resetAll'),

  /* window controls */
  win: {
    minimize: () => ipcRenderer.invoke('win:minimize'),
    maximize: () => ipcRenderer.invoke('win:maximize'),
    close: () => ipcRenderer.invoke('win:close')
  },

  /* events from main */
  onToast: (cb) => ipcRenderer.on('ui:toast', (_e, data) => cb(data)),
  onStateChanged: (cb) => ipcRenderer.on('ui:state-changed', (_e, data) => cb(data)),
  onBindingRun: (cb) => ipcRenderer.on('ui:binding-run', (_e, data) => cb(data))
});
