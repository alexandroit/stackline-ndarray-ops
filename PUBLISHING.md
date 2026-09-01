# Publishing

Publishing is a separate, explicitly authorized operation. Do not publish from
an ordinary implementation checkout.

An authorized release operator must start from a clean, reviewed green commit,
use the pinned toolchain documented by CI, run `npm ci` and `npm run verify`,
then run `npm run artifact:prepare`. Inspect the immutable tarball inventory,
hashes, one-node closure, licenses and CycloneDX SBOM before any registry write.

Test both the scoped identity and the historical-key npm alias from the exact
accepted tarball. Never rebuild between acceptance and publication.
