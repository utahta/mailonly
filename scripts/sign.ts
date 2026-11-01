// Signs the macOS app ad hoc. electron-builder 26.18.0 looks up the identity
// "-" as a substring of keychain certificate names, so it signs with any
// certificate that has a hyphen in its name.
import { signAsync, type SignOptions } from '@electron/osx-sign';

export default async function sign(opts: SignOptions): Promise<void> {
  await signAsync({ ...opts, identity: '-' });
}
