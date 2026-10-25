import type { SidebarApi, SidebarState } from '../shared/api.ts';

// Sandboxed preloads cannot load ES modules.
const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron');

const api: SidebarApi = {
  onState(callback) {
    ipcRenderer.on('state', (_event, state: SidebarState) => callback(state));
  },
  select: (id) => ipcRenderer.send('select', id),
  add: () => ipcRenderer.send('add'),
  showAccountMenu: (id) => ipcRenderer.send('account-menu', id),
};

contextBridge.exposeInMainWorld('mailonly', api);
