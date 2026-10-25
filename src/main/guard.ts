import { shell, type Session, type WebContents } from 'electron';
import { canNavigateInView, canOpenExternally, windowOpenTarget } from './rules.ts';

export function guardSession(session: Session): void {
  session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.setPermissionCheckHandler(() => false);
}

function openExternally(url: string): void {
  if (canOpenExternally(url)) void shell.openExternal(url);
}

export function guardContents(contents: WebContents): void {
  contents.on('will-navigate', (event) => {
    if (canNavigateInView(event.url)) return;
    event.preventDefault();
    openExternally(event.url);
  });
  contents.on('will-redirect', (event) => {
    if (!event.isMainFrame || canNavigateInView(event.url)) return;
    event.preventDefault();
    openExternally(event.url);
  });
  contents.setWindowOpenHandler(({ url }) => {
    switch (windowOpenTarget(url)) {
      case 'child':
        return { action: 'allow' };
      case 'view':
        void contents.loadURL(url);
        break;
      case 'external':
        openExternally(url);
        break;
    }
    return { action: 'deny' };
  });
  contents.on('did-create-window', (child) => guardContents(child.webContents));
}
