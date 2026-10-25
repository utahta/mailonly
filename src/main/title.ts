// Gmail titles look like "Inbox (3) - foo@example.com - Gmail". The first part
// names the current screen, and the count is left out when it is zero.
const TITLE = /^(.*) - ([^\s@]+@[^\s@]+) - Gmail$/;
const COUNT = /\(([\d.,\s]+)\)$/;

export type TitleInfo = {
  email: string;
  // Undefined unless the inbox is shown, since other screens carry no count.
  unread?: number;
};

export function readTitle(title: string, url: string): TitleInfo | null {
  const m = TITLE.exec(title);
  if (!m) return null;
  const [, screen, email] = m;
  if (!isInbox(url)) return { email };
  const count = COUNT.exec(screen);
  return { email, unread: count ? Number(count[1].replace(/\D/g, '')) : 0 };
}

// The screen name in the title depends on Gmail's display language; the URL
// fragment does not.
function isInbox(url: string): boolean {
  return URL.canParse(url) && /^#inbox(\?|$)/.test(new URL(url).hash);
}
