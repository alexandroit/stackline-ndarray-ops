# Migration

## Historical-key alias

```json
{
  "dependencies": {
    "ndarray-ops": "npm:@stackline/ndarray-ops@1.0.1"
  }
}
```

No source change is required for either root imports or the historical
`ndarray-ops/ndarray-ops.js` deep import. The replacement has no production
dependencies and does not require an `unsafe-eval` CSP exception.

Before merging, run the downstream's complete tests and add a view-layout
smoke covering the operations it uses. Invalid ndarray metadata that upstream
handled unpredictably is rejected; see `COMPATIBILITY_CONTRACT.md`.
