# @stackline/ndarray-ops

A dependency-free, CSP-safe continuation of `ndarray-ops@1.2.2`. It preserves
the complete 150-function CommonJS API, including the historical
`ndarray-ops.js` deep entry, while adding native ESM, a classic-browser build,
and first-party TypeScript 3.9 declarations.

Stackline maintains this package independently. It is not affiliated with or
endorsed by the original project.

## Install

```sh
npm install @stackline/ndarray-ops
```

An identity-preserving migration keeps existing imports unchanged:

```json
{
  "dependencies": {
    "ndarray-ops": "npm:@stackline/ndarray-ops@^1.0.0"
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

## API

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

## CSP and performance

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

## License

MIT. Original runtime and DefinitelyTyped attribution is preserved in
`LICENSE`, `NOTICE`, and `THIRD_PARTY_LICENSES.md`.
