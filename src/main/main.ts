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

// A debugging port or pipe lets any local process read every account's pages
// and cookies. Exiting here comes before Electron opens it (Electron 44.10.1,
// macOS).
if (
  app.isPackaged &&
  (app.commandLine.hasSwitch('remote-debugging-port') || app.commandLine.hasSwitch('remote-debugging-pipe'))
) {
  app.exit(1);
}

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
  if (config.maximized) win.maximize();
  // isMaximized() is false while the window is minimized, so the state is
  // tracked here instead of being read when the window closes.
  let maximized = config.maximized === true;
  win.on('maximize', () => {
    maximized = true;
  });
  win.on('unmaximize', () => {
    maximized = false;
  });
  const accounts = new Accounts(win, config, () => {
    const state = accounts.state();
    win.webContents.send('state', state);
    // Keeps the total visible on the Dock icon while the window is hidden.
    // Windows draws it over the taskbar button.
    app.setBadgeCount(state.accounts.reduce((sum, account) => sum + (account.unread ?? 0), 0));
    setMenu();
  });

  function setMenu(): void {
    const switchItems = accounts.list.slice(0, 9).map(
      (account, i): MenuItemConstructorOptions => ({
        label: account.label || 'New Account',
        accelerator: `CmdOrCtrl+${i + 1}`,
        click: () => {
          accounts.select(account.id);
          win.show();
        },
      }),
    );
    const template: MenuItemConstructorOptions[] = [
      ...(isMac ? [{ role: 'appMenu' } as const] : []),
      // On macOS this holds Close Window (Cmd+W); elsewhere it holds Quit.
      { role: 'fileMenu' },
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
        submenu: [
          ...switchItems,
          { type: 'separator' },
          {
            label: 'Add Account',
            click: () => {
              accounts.add();
              win.show();
            },
          },
        ],
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
  // On macOS, closing the window only hides it, so reopening it does not
  // reload Gmail.
  let quitting = false;
  app.on('before-quit', () => {
    quitting = true;
  });
  win.on('close', (event) => {
    if (isMac && !quitting) {
      event.preventDefault();
      hide();
      return;
    }
    config.bounds = win.getNormalBounds();
    config.maximized = maximized;
    saveConfig(config);
  });
  // Hiding a full-screen window leaves an empty black Space behind
  // (https://github.com/electron/electron/issues/20263).
  function hide(): void {
    if (win.isFullScreen()) {
      win.once('leave-full-screen', () => win.hide());
      win.setFullScreen(false);
    } else {
      win.hide();
    }
  }
  // A Dock click on a visible window would raise it over Gmail's pop-outs.
  app.on('activate', () => {
    if (!win.isVisible()) win.show();
  });
  app.on('second-instance', () => {
    if (win.isMinimized()) win.restore();
    win.show();
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
