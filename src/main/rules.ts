const VIEW_HOSTS = new Set([
  'mail.google.com',
  'accounts.google.com',
  'myaccount.google.com',
  'accounts.youtube.com',
  'workspace.google.com',
]);

// Sign-in ends by setting cookies on the country domain, such as
// accounts.google.co.jp.
const COUNTRY_ACCOUNTS_HOST = /^accounts\.google\.(com?\.)?[a-z]{2}$/;

const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

function parse(url: string): URL | null {
  return URL.canParse(url) ? new URL(url) : null;
}

export function canNavigateInView(url: string): boolean {
  const u = parse(url);
  return u?.protocol === 'https:' && (VIEW_HOSTS.has(u.hostname) || COUNTRY_ACCOUNTS_HOST.test(u.hostname));
}

export function canOpenExternally(url: string): boolean {
  const u = parse(url);
  return u !== null && EXTERNAL_PROTOCOLS.has(u.protocol);
}

export type WindowOpenTarget = 'child' | 'view' | 'external' | 'none';

export function windowOpenTarget(url: string): WindowOpenTarget {
  const u = parse(url);
  if (u?.protocol === 'https:' && u.hostname === 'mail.google.com') return 'child';
  // The Gmail landing page opens sign-in in a new window. Signing in there has
  // to happen in the requesting view so the session lands in its partition.
  if (u?.protocol === 'https:' && u.hostname === 'accounts.google.com') return 'view';
  return canOpenExternally(url) ? 'external' : 'none';
}
