import { session, WebContentsView, type BrowserWindow, type WebContents } from 'electron';
import { randomUUID } from 'node:crypto';
import type { SidebarState } from '../shared/api.ts';
import { saveConfig, type Account, type Config } from './config.ts';
import { guardContents, guardSession } from './guard.ts';
import { readTitle } from './title.ts';

// Must match the nav width in src/renderer/sidebar.css.
const SIDEBAR_WIDTH = 68;

const GMAIL_URL = 'https://mail.google.com/';
const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#db2777', '#4d7c0f'];

function partition(id: string): string {
  return `persist:acct-${id}`;
}

// Keeps one Gmail view per account alive and shows only the selected one, so
// every account's unread count stays current.
export class Accounts {
  readonly #win: BrowserWindow;
  readonly #config: Config;
  readonly #onChange: () => void;
  readonly #views = new Map<string, WebContentsView>();
  readonly #unread = new Map<string, number>();

  constructor(win: BrowserWindow, config: Config, onChange: () => void) {
    this.#win = win;
    this.#config = config;
    this.#onChange = onChange;
    for (const account of config.accounts) this.#open(account);
    this.#show(config.selected ?? config.accounts[0]?.id);
    // Not the window's resize event: on Windows, showing the auto-hidden menu
    // bar shrinks the content view without resizing the window.
    win.contentView.on('bounds-changed', () => this.#layout());
  }

  get list(): readonly Account[] {
    return this.#config.accounts;
  }

  state(): SidebarState {
    return {
      accounts: this.#config.accounts.map((account) => ({ ...account, unread: this.#unread.get(account.id) })),
      selected: this.#config.selected,
    };
  }

  selected(): WebContents | undefined {
    const id = this.#config.selected;
    return id === undefined ? undefined : this.#views.get(id)?.webContents;
  }

  select(id: string): void {
    if (!this.#views.has(id)) return;
    this.#show(id);
    this.#save();
  }

  add(): void {
    const color = COLORS[this.#config.accounts.length % COLORS.length];
    const account = { id: randomUUID(), label: '', color };
    this.#config.accounts.push(account);
    this.#open(account);
    this.select(account.id);
  }

  async remove(id: string): Promise<void> {
    const view = this.#views.get(id);
    if (!view) return;
    this.#win.contentView.removeChildView(view);
    view.webContents.close();
    this.#views.delete(id);
    this.#unread.delete(id);
    this.#config.accounts = this.#config.accounts.filter((account) => account.id !== id);
    if (this.#config.selected === id) this.#show(this.#config.accounts[0]?.id);
    this.#save();

    const ses = session.fromPartition(partition(id));
    await ses.clearStorageData();
    await ses.clearCache();
  }

  #open(account: Account): void {
    const view = new WebContentsView({ webPreferences: { partition: partition(account.id) } });
    const contents = view.webContents;
    guardSession(contents.session);
    guardContents(contents);
    // Gmail can update the title before or after the URL fragment, so check
    // again on both.
    const update = () => this.#readTitle(account, contents);
    contents.on('page-title-updated', update);
    contents.on('did-navigate-in-page', update);

    view.setVisible(false);
    this.#win.contentView.addChildView(view);
    this.#views.set(account.id, view);
    void contents.loadURL(GMAIL_URL);
  }

  #show(id: string | undefined): void {
    this.#config.selected = id;
    for (const [viewId, view] of this.#views) view.setVisible(viewId === id);
    this.#layout();
    if (id !== undefined) this.#views.get(id)?.webContents.focus();
  }

  #layout(): void {
    const { width, height } = this.#win.contentView.getBounds();
    const bounds = { x: SIDEBAR_WIDTH, y: 0, width: Math.max(0, width - SIDEBAR_WIDTH), height };
    for (const view of this.#views.values()) view.setBounds(bounds);
  }

  #readTitle(account: Account, contents: WebContents): void {
    const info = readTitle(contents.getTitle(), contents.getURL());
    if (!info) return;
    let changed = false;
    if (!account.label) {
      account.label = info.email;
      saveConfig(this.#config);
      changed = true;
    }
    if (info.unread !== undefined && info.unread !== this.#unread.get(account.id)) {
      this.#unread.set(account.id, info.unread);
      changed = true;
    }
    if (changed) this.#onChange();
  }

  #save(): void {
    saveConfig(this.#config);
    this.#onChange();
  }
}
