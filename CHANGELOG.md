# Changelog

## 1.0.5 - 2026-11-04

- Correct the current package version and installation examples in the published README.
- Reject stale README version claims in the packed artifact before npm publication.

## 1.0.4 - 2026-11-04

- Update development dependency overrides for current security fixes.
- Use patched Node.js tooling and validate release metadata against the package manifest.

## [1.0.1] - 2026-09-28

- Organize package documentation, preserve API and migration examples, and add Stackline community links.
- Improve package discovery keywords with precise domain terms and `stackline`.
- Pin GitHub Actions release tooling and require an explicit missing-version response before publication.


## 1.0.0

- Preserve the complete ndarray-ops 1.2.2 operation and traversal contract.
- Replace cwise runtime compilation with a dependency-free CSP-safe walker.
- Add CJS/deep-entry, ESM, AMD/classic-browser and TypeScript 3.9 support.
- Reject unsafe malformed ndarray metadata.
- Add differential fuzz, alias, generic, stress, CSP, type, packed-consumer,
  license, closure, SBOM, package-quality, audit and performance gates.
