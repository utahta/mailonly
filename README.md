# mailonly

A desktop app for using several personal Gmail accounts in one window.

mailonly is not affiliated with, endorsed by, or sponsored by Google. Gmail is a trademark of Google LLC.

## Features

- Each account has a button in the sidebar with its unread inbox count. Switch accounts with a click or <kbd>Cmd/Ctrl</kbd>+<kbd>1</kbd> to <kbd>9</kbd>.
- On macOS, closing the window keeps mailonly running in the Dock, with the total unread count on its icon. Quit with <kbd>Cmd</kbd>+<kbd>Q</kbd>.
- Each account runs in its own session, with separate cookies and storage.
- Links in messages open in your default browser.
- mailonly denies every permission request from Gmail, such as notifications or the camera.

## Install

### macOS

With [Homebrew](https://brew.sh/):

```sh
brew install --cask utahta/tap/mailonly
```

Use `brew upgrade --cask mailonly` to update.

Alternatively, download `mailonly-*-arm64-mac.zip` from the [releases page](https://github.com/utahta/mailonly/releases), unzip it, and move `mailonly.app` to your Applications folder. The app is signed ad hoc and is not notarized by Apple, so macOS may refuse to open it. If you downloaded it from this project's releases page and trust that copy, remove its quarantine flag:

```sh
xattr -dr com.apple.quarantine /Applications/mailonly.app
```

The command only removes the flag. It does not check that the app is safe.

After an update, macOS may ask again for access to the "mailonly Safe Storage" keychain item, because the app is signed ad hoc. The item holds the key that encrypts your session cookies.

### Windows

Download `mailonly-*-x64-setup.exe` from the [releases page](https://github.com/utahta/mailonly/releases) and run it. The installer sets up mailonly for the current user and needs no administrator rights. It is not signed, so Microsoft Defender SmartScreen warns about it. Choose **More info** and then **Run anyway**.

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
make dist       # package for the current OS into release/
make clean      # remove dist/ and release/
```

`make start` runs the app on a copy of Electron with cookie encryption turned on, and keeps its data in `mailonly-dev`, apart from the installed app. Don't run the app with `npx electron .`, because Electron without cookie encryption can't read the encrypted cookies.

## License

MIT
