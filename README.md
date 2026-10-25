# mailonly

A desktop app for using several personal Gmail accounts in one window.

mailonly is not affiliated with, endorsed by, or sponsored by Google. Gmail is a trademark of Google LLC.

## Features

- Each account has a button in the sidebar with its unread inbox count. Switch accounts with a click or <kbd>Cmd/Ctrl</kbd>+<kbd>1</kbd> to <kbd>9</kbd>.
- Each account runs in its own session, with separate cookies and storage.
- Links in messages open in your default browser.
- mailonly denies every permission request from Gmail, such as notifications or the camera.

## Security

- You sign in on Google's own pages inside the app. mailonly does not read or store your password.
- Session cookies are encrypted on disk with a key protected by the operating system. Other cached data, such as parts of opened messages, is not encrypted, so turn on full-disk encryption.
- If you think someone has stolen your session, sign out the device from your Google Account's security settings.

## Development

Requires Node.js 24.

```sh
make start      # build and run
make test       # unit tests
make typecheck  # type-check sources and tests
make build      # compile to dist/
make clean      # remove dist/
```

`make start` runs the app on a copy of Electron with cookie encryption turned on, and keeps its data in `mailonly-dev`, apart from the installed app. Don't run the app with `npx electron .`, because Electron without cookie encryption can't read the encrypted cookies.

## License

MIT
