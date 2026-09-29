# @stackline/ndarray-ops

> Dependency-free, CSP-safe elementwise and aggregate operations for ndarrays.

[![npm version](https://img.shields.io/npm/v/@stackline/ndarray-ops.svg?style=flat-square)](https://www.npmjs.com/package/@stackline/ndarray-ops)
[![license](https://img.shields.io/npm/l/@stackline/ndarray-ops.svg?style=flat-square)](https://github.com/alexandroit/stackline-ndarray-ops)
[![GitHub repository](https://img.shields.io/badge/GitHub-repository-181717?style=flat-square&logo=github)](https://github.com/alexandroit/stackline-ndarray-ops)
[![Docs](https://img.shields.io/badge/docs-alexandro.net-0f766e?style=flat-square)](https://alexandro.net/docs/vanilla/ndarray-ops/)
[![Reddit community](https://img.shields.io/badge/community-r%2FStackline-ff4500?style=flat-square&logo=reddit&logoColor=white)](https://www.reddit.com/r/Stackline/)

**[Documentation](https://alexandro.net/docs/vanilla/ndarray-ops/)** | **[npm](https://www.npmjs.com/package/@stackline/ndarray-ops)** | **[Issues](https://github.com/alexandroit/stackline-ndarray-ops/issues)** | **[Repository](https://github.com/alexandroit/stackline-ndarray-ops)**

**Current package version:** `1.0.3`

---

## Why this package?

A dependency-free, CSP-safe continuation of `ndarray-ops@1.2.2`. It preserves
the complete 150-function CommonJS API, including the historical
`ndarray-ops.js` deep entry, while adding native ESM, a classic-browser build,
and first-party TypeScript 3.9 declarations.

Stackline maintains this package independently. It is not affiliated with or
endorsed by the original project.

## Compatibility

| Item | Value |
| --- | --- |
| Package | `@stackline/ndarray-ops@1.0.3` |
| Node.js runtime | `>=18.0.0` |
| CommonJS / primary entry | `./ndarray-ops.js` |
| ES module entry | `./index.mjs` |
| Type declarations | `./index.d.ts` |

## Installation

<a id="install"></a>

### Install

```sh
npm install @stackline/ndarray-ops
```

An identity-preserving migration keeps existing imports unchanged:

## Usage

```json
{
  "dependencies": {
    "ndarray-ops": "npm:@stackline/ndarray-ops@^1.0.1"
  }
}
```

```js
const ops = require('ndarray-ops')
const same = require('ndarray-ops/ndarray-ops.js')
```

Native ESM supports both default and named imports:

```js
import ops, { add, sum } from '@stackline/ndarray-ops'
```

Loading `browser.js` as a classic script exposes `globalThis.ndarrayOps`; AMD
loaders receive the same operation object.

Declarations support TypeScript 3.9 CommonJS import assignment and synthetic
default imports. Conditional named ESM declarations are selected by TypeScript
4.7 and later.

## Features and Integrations

<a id="csp-and-performance"></a>

### CSP and performance

Runtime code generation is not used. The package loads and runs under Node's
string-code-generation prohibition and in a browser VM where Function
construction is disabled. This removes the upstream `unsafe-eval` requirement.

Static typed paths for the common one-, two-, and three-dimensional layouts
avoid the upstream compiler's cold specialization cost. CI also enforces a
conservative hot-loop bound: a 15-case repeated-batch matrix of large
contiguous and mixed-order operations must stay within 5x upstream and under
50 ms per call on the test host. That gate guards regressions; exact
performance depends on runtime, dtype, rank, and layout.

See `COMPATIBILITY_CONTRACT.md` for traversal order, empty/rank-zero behavior,
generic side effects, validation hardening, and exact return contracts.

## Security

Review inputs and the package-specific compatibility limits before processing untrusted data. Report suspected vulnerabilities as described in the [security policy](https://github.com/alexandroit/stackline-ndarray-ops/blob/main/SECURITY.md).

## API Surface

<a id="api"></a>

### API

The package includes all upstream operator families:

- arithmetic and bitwise: `add`, `sub`, `mul`, `div`, `mod`, `band`, `bor`,
  `bxor`, `lshift`, `rshift`, and `rrshift`;
- logical and comparisons: `and`, `or`, `eq`, `neq`, `lt`, `gt`, `leq`, and
  `geq`;
- unary and Math functions, including reversed `atan2op*` and `powop*` forms;
- `assign`, `assigns`, `random`, `equals`, `any`, `all`, numeric norms and
  reductions, `sup`, `inf`, `argmin`, and `argmax`.

The historical suffixes remain: `eq` means in-place, `s` means a scalar right
operand, `seq` combines both, and `op` reverses `atan2` or `pow` operands.
Every elementwise/mutating function returns its first ndarray argument.

Views may use arbitrary non-negative signed-32-bit integer shapes, positive,
zero or negative signed-32-bit integer strides and offsets, and any permutation in `order`.
Typed and generic (`data.get`/`data.set`) storage are supported. Shapes must
match exactly across array arguments.

## Local Development

```sh
git clone https://github.com/alexandroit/stackline-ndarray-ops.git
cd stackline-ndarray-ops
npm ci
npm run verify
```

Release tooling uses Node.js 24.20.0 and npm 11.19.0. The consumer runtime contract remains the one documented above.

## Consumer Smoke Test

Run the repository's existing consumer/package check after installing development dependencies:

```sh
npm run test:smoke
```

## Release Checklist

Run `npm run verify` and inspect the package contents before release. Publish a new version through the [GitHub Actions publishing workflow](https://github.com/alexandroit/stackline-ndarray-ops/actions/workflows/publish.yml), using the SHA-512 digest of the reviewed tarball. Verify the exact published version, tarball integrity, and npm provenance after the run.

## License

MIT. Original runtime and DefinitelyTyped attribution is preserved in
`LICENSE`, `NOTICE`, and `THIRD_PARTY_LICENSES.md`.

## Credits and original authors

- Stackline maintainers.
- Mikola Lysenko.
- DefinitelyTyped contributors.
- Copyright (c) 2013 Mikola Lysenko.
- Copyright (c) 2026 Stackline maintainers.
- Stackline maintenance: [Alexandro Paixao Marques](https://www.linkedin.com/in/aleinfo/) and [Stackline contributors](https://github.com/alexandroit).

Original copyright, license notices and contributor acknowledgements remain part of this distribution. Stackline maintenance does not replace authorship of the original work.

## Community and Links

- [Stackline website](https://alexandro.net/)
- [GitHub projects](https://github.com/alexandroit)
- [npm packages](https://www.npmjs.com/~alex360qc)
- [Reddit community — r/Stackline](https://www.reddit.com/r/Stackline/)
- [Maintainer LinkedIn](https://www.linkedin.com/in/aleinfo/)

Use this repository's issue tracker for reproducible bugs and feature requests. Join r/Stackline for examples, usage questions and release discussions.
