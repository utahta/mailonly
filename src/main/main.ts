import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  screen,
  type IpcMainEvent,
  type MenuItemConstructorOptions,
} from 'electron';
import path from 'node:path';
import { Accounts } from './accounts.ts';
import { loadConfig, saveConfig, type Account, type Bounds } from './config.ts';

// Drop the app name but keep the Electron token: with a plain Chrome UA,
// Google's sign-in rejected Electron (Electron 44.9.0, macOS).
app.userAgentFallback = app.userAgentFallback.replace(` ${app.getName()}/${app.getVersion()}`, '');

// Development runs get their own sign-ins and keychain key. Any code can run
// on the development Electron binary, so it must not unlock the installed
// app's cookies.
if (!app.isPackaged) {
  app.setName(`${app.getName()}-dev`);
  if (!app.commandLine.hasSwitch('user-data-dir')) {
    app.setPath('userData', path.join(app.getPath('appData'), app.getName()));
  }
}

const isMac = process.platform === 'darwin';

function visibleBounds(bounds: Bounds | undefined): Bounds | undefined {
  if (!bounds) return undefined;
  const area = screen.getDisplayMatching(bounds).workArea;
  const overlaps =
    bounds.x < area.x + area.width &&
    area.x < bounds.x + bounds.width &&
    bounds.y < area.y + area.height &&
    area.y < bounds.y + bounds.height;
  return overlaps ? bounds : undefined;
}

function start(): void {
  const config = loadConfig();
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    ...visibleBounds(config.bounds),
    minWidth: 480,
    minHeight: 360,
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(import.meta.dirname, '../preload/sidebar.cjs') },
  });
  const accounts = new Accounts(win, config, () => {
    win.webContents.send('state', accounts.state());
    setMenu();
  });

  function setMenu(): void {
    const switchItems = accounts.list.slice(0, 9).map(
      (account, i): MenuItemConstructorOptions => ({
        label: account.label || 'New Account',
        accelerator: `CmdOrCtrl+${i + 1}`,
        click: () => accounts.select(account.id),
      }),
    );
    const template: MenuItemConstructorOptions[] = [
      isMac ? { role: 'appMenu' } : { role: 'fileMenu' },
      { role: 'editMenu' },
      {
        label: 'View',
        submenu: [
          { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => accounts.selected()?.reload() },
          {
            label: 'Toggle Developer Tools',
            accelerator: isMac ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
            click: () => accounts.selected()?.toggleDevTools(),
          },
        ],
      },
      {
        label: 'Accounts',
        submenu: [...switchItems, { type: 'separator' }, { label: 'Add Account', click: () => accounts.add() }],
      },
      { role: 'windowMenu' },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }

  async function confirmRemove(account: Account): Promise<void> {
    const { response } = await dialog.showMessageBox(win, {
      type: 'warning',
      buttons: ['Remove', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      // Windows would otherwise show Remove as a command link.
      noLink: true,
      message: `Remove ${account.label || 'this account'}?`,
      detail: 'Its sign-in data is deleted from this app. Your Google account is not affected.',
    });
    if (response === 0) await accounts.remove(account.id);
  }

  const fromSidebar = (event: IpcMainEvent) => event.sender === win.webContents;
  ipcMain.on('select', (event, id: unknown) => {
    if (fromSidebar(event) && typeof id === 'string') accounts.select(id);
  });
  ipcMain.on('add', (event) => {
    if (fromSidebar(event)) accounts.add();
  });
  ipcMain.on('account-menu', (event, id: unknown) => {
    const account = accounts.list.find((a) => a.id === id);
    if (!fromSidebar(event) || !account) return;
    const menu = Menu.buildFromTemplate([{ label: 'Remove Account…', click: () => void confirmRemove(account) }]);
    menu.popup({ window: win });
  });

  win.webContents.on('did-finish-load', () => win.webContents.send('state', accounts.state()));
  // Dropping a file or link on the sidebar would otherwise navigate it away.
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.on('close', () => {
    config.bounds = win.getNormalBounds();
    saveConfig(config);
  });
  app.on('second-instance', () => {
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  setMenu();
  void win.loadFile(path.join(import.meta.dirname, '../renderer/sidebar.html'));
}

// A second process would open the same partitions and race on their storage.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('window-all-closed', () => app.quit());
  void app.whenReady().then(start);
}
