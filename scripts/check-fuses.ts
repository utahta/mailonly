// Fails unless the packaged app at the given path has the fuses that
// electron-builder.yml sets, so a release cannot ship with them at their
// defaults.
// Usage: node scripts/check-fuses.ts <path to .app or .exe>
import { FuseState, FuseV1Options, getCurrentFuseWire } from '@electron/fuses';

const want: [FuseV1Options, FuseState][] = [
  [FuseV1Options.RunAsNode, FuseState.DISABLE],
  [FuseV1Options.EnableCookieEncryption, FuseState.ENABLE],
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable, FuseState.DISABLE],
  [FuseV1Options.EnableNodeCliInspectArguments, FuseState.DISABLE],
  [FuseV1Options.EnableEmbeddedAsarIntegrityValidation, FuseState.ENABLE],
  [FuseV1Options.OnlyLoadAppFromAsar, FuseState.ENABLE],
];

const wire = await getCurrentFuseWire(process.argv[2]);
const wrong = want.filter(([fuse, state]) => wire[fuse] !== state);
for (const [fuse, state] of wrong) {
  console.error(`${FuseV1Options[fuse]}: want ${FuseState[state]}, got ${FuseState[wire[fuse]!] ?? 'missing'}`);
}
process.exit(wrong.length ? 1 : 0);
