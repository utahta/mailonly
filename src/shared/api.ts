export type AccountState = {
  id: string;
  label: string;
  color: string;
  unread?: number;
};

export type SidebarState = {
  accounts: AccountState[];
  selected?: string;
};

export type SidebarApi = {
  onState(callback: (state: SidebarState) => void): void;
  select(id: string): void;
  add(): void;
  showAccountMenu(id: string): void;
};
