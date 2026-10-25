import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canNavigateInView, canOpenExternally, windowOpenTarget } from './rules.ts';

test('canNavigateInView allows Gmail and the sign-in hosts', () => {
  for (const url of [
    'https://mail.google.com/mail/u/0/#inbox',
    'https://accounts.google.com/v3/signin/identifier?flowName=WebLiteSignIn',
    'https://myaccount.google.com/verification/selfie/precollection',
    'https://accounts.youtube.com/accounts/SetSID',
    'https://accounts.google.co.jp/accounts/SetSID',
    'https://accounts.google.com.au/accounts/SetSID',
    'https://accounts.google.de/accounts/SetSID',
    'https://workspace.google.com/intl/ja/gmail/',
  ]) {
    assert.equal(canNavigateInView(url), true, url);
  }
});

test('canNavigateInView rejects other hosts and schemes', () => {
  for (const url of [
    'https://www.google.com/url?q=https://example.com/',
    'https://example.com/',
    'https://accounts.google.example.com/',
    'https://mail.google.com.example.com/',
    'http://mail.google.com/',
    'file:///etc/passwd',
    'not a url',
  ]) {
    assert.equal(canNavigateInView(url), false, url);
  }
});

test('canOpenExternally allows only http, https and mailto', () => {
  assert.equal(canOpenExternally('https://example.com/'), true);
  assert.equal(canOpenExternally('http://example.com/'), true);
  assert.equal(canOpenExternally('mailto:foo@example.com'), true);
  assert.equal(canOpenExternally('file:///Applications/Calculator.app'), false);
  assert.equal(canOpenExternally('javascript:alert(1)'), false);
  assert.equal(canOpenExternally('not a url'), false);
});

test('windowOpenTarget routes by destination', () => {
  assert.equal(windowOpenTarget('https://mail.google.com/mail/u/0/?view=pt'), 'child');
  assert.equal(windowOpenTarget('https://accounts.google.com/AccountChooser/signinchooser'), 'view');
  assert.equal(windowOpenTarget('https://www.google.com/url?q=https://example.com/'), 'external');
  assert.equal(windowOpenTarget('mailto:foo@example.com'), 'external');
  assert.equal(windowOpenTarget('about:blank'), 'none');
});
