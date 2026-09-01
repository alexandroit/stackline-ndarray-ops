# Contributing

Keep changes focused and preserve the compatibility contract. Run:

```sh
npm ci
npm run verify
```

New operations or traversal changes require upstream differential fixtures,
valid-layout fuzzing, generic-storage ordering tests, CSP execution, and a
performance-gate result. Do not weaken production-closure, license, SBOM,
package-quality, audit, or packed-consumer checks.
