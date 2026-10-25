import type { AccountState, SidebarApi, SidebarState } from '../shared/api.ts';

declare global {
  interface Window {
    mailonly: SidebarApi;
  }
}

const list = document.querySelector<HTMLUListElement>('#accounts')!;
const empty = document.querySelector<HTMLElement>('#empty')!;
const modifier = /Mac/.test(navigator.userAgent) ? '⌘' : 'Ctrl+';

function item(account: AccountState, index: number, selected: boolean): HTMLLIElement {
  const label = account.label || 'New account';
  const button = document.createElement('button');
  button.className = 'account';
  button.style.backgroundColor = account.color;
  button.textContent = label[0].toUpperCase();
  button.title = index < 9 ? `${label} (${modifier}${index + 1})` : label;
  button.ariaLabel = account.unread ? `${label}, ${account.unread} unread` : label;
  if (selected) button.ariaCurrent = 'true';
  if (account.unread) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = account.unread > 99 ? '99+' : String(account.unread);
    button.append(badge);
  }
  button.addEventListener('click', () => window.mailonly.select(account.id));
  button.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    window.mailonly.showAccountMenu(account.id);
  });

  const li = document.createElement('li');
  li.append(button);
  return li;
}

function render(state: SidebarState): void {
  empty.hidden = state.accounts.length > 0;
  list.replaceChildren(...state.accounts.map((account, i) => item(account, i, account.id === state.selected)));
}

document.querySelector('#add')!.addEventListener('click', () => window.mailonly.add());
window.mailonly.onState(render);
