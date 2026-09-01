# Verification

The complete local gate is:

```sh
npm install
npm run verify
```

It covers all 150 exports and upstream fixtures. The deterministic differential
matrices persist 5,364 all-API layout checks and 12,240 shared-buffer alias
checks, in addition to 400 valid-layout and 500 overlap fuzz cases generated
from the fixed `0x6d2b79f5` seed. Malformed metadata, generic get/set ordering,
rank-zero and empty views, and stress/block boundaries are covered separately.

The release gate also exercises CSP execution, CJS/ESM/browser/deep entries,
TypeScript 3.9 and current declarations, and a 15-case repeated-batch
performance matrix bounded to 5x upstream and 50 milliseconds per call. It
installs exact packed scoped and npm-alias consumers, runs publint and Are the
Types Wrong, checks licenses, proves the exact one-node production closure,
cross-checks a CycloneDX SBOM, validates release metadata and npm pack
inventory, and runs production, full, and registry-signature audits.

The same gate prepares and validates the 19-file Alexandro.Net package
documentation tree, including localized catalog metadata, robots, sitemap and
machine-readable references.
