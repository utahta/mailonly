import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readTitle } from './title.ts';

const INBOX = 'https://mail.google.com/mail/u/0/#inbox';

test('readTitle reads the unread count on the inbox', () => {
  assert.deepEqual(readTitle('受信トレイ (13) - foo@example.com - Gmail', INBOX), { email: 'foo@example.com', unread: 13 });
  assert.deepEqual(readTitle('Inbox (1,234) - foo@example.com - Gmail', INBOX), { email: 'foo@example.com', unread: 1234 });
  assert.deepEqual(
    readTitle('Inbox (3) - foo@example.com - Gmail', `${INBOX}?compose=new`),
    { email: 'foo@example.com', unread: 3 },
  );
});

test('readTitle treats an inbox title without a count as zero', () => {
  assert.deepEqual(readTitle('受信トレイ - foo@example.com - Gmail', INBOX), { email: 'foo@example.com', unread: 0 });
});

test('readTitle leaves the count undefined outside the inbox', () => {
  assert.deepEqual(
    readTitle('Re: build (2) - status - foo@example.com - Gmail', `${INBOX}/FMfcgzAAAAAAAAAAAAAAAAAA`),
    { email: 'foo@example.com' },
  );
  assert.deepEqual(
    readTitle('検索結果 - foo@example.com - Gmail', 'https://mail.google.com/mail/u/0/#search/foo'),
    { email: 'foo@example.com' },
  );
});

test('readTitle returns null for titles without an account', () => {
  assert.equal(readTitle('Gmail', INBOX), null);
  assert.equal(readTitle('ログイン - Google アカウント', 'https://accounts.google.com/'), null);
});
