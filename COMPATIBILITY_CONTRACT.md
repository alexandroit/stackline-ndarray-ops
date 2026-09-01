# Compatibility contract

## Public surface

The 150 enumerable CommonJS keys, their insertion order, arities, generated
function names, argument order, and return values match `ndarray-ops@1.2.2`.
`require('@stackline/ndarray-ops/ndarray-ops.js')` returns the same object as the
root CommonJS entry. ESM named exports mirror every key and the default export
is that operation object.

All 137 elementwise, assignment, scalar, in-place, and random functions return
the destination object by identity. The other 13 functions return boolean,
number, or logical index results as observed upstream.

## Traversal

Logical indices follow the first array's `order`: `order[0]` is innermost. If
all array orders match, every coordinate increases from zero. If orders differ,
the longest common fastest-order prefix is retained and remaining dimensions
are visited in 64-cell blocks from the high end toward zero, exactly like cwise.

This order is observable for floating-point reductions, random number
placement, early exits, argmin/argmax ties, overlapping views, and generic
storage side effects. Differential fuzzing covers arbitrary valid rank,
shape, stride, offset, order, storage aliases, and block boundaries.

Rank-zero views contain one scalar element. Any zero extent contains no
elements. Empty identities are: `any=false`, `all=true`, `sum=0`, `prod=1`,
`norm*=0`, `sup=-Infinity`, `inf=Infinity`; `argmin` and `argmax` return a copy
of the shape when no value improves their initial sentinel.

Generic destinations are read once before every write, preserving cwise's
observable `get`/`set` sequence. Logical `and` and `or` preserve JavaScript
short-circuiting, including skipped generic right-hand reads.

## Validation hardening

Valid ndarray views require Array shapes and strides of equal rank, signed
32-bit non-negative extents, signed 32-bit strides, a string
dtype, storage, and an exact order permutation. Generic storage must implement
`get` and `set`. An omitted offset is normalized to zero for upstream
compatibility; an explicit offset must be a signed 32-bit integer.

Upstream trusts malformed metadata and can loop forever for non-finite extents,
wrap block sizes through 32-bit coercion, generate invalid source for malformed
orders, or address nonsensical storage. This continuation intentionally rejects
such invalid views with `TypeError` or `RangeError`. Shape dimensionality and
value mismatches retain the upstream cwise error messages and are checked
before other metadata on later arguments.

## CSP

The production JavaScript contains no dynamic string compilation. CJS, ESM,
AMD, and classic-browser global loading work with string code generation
disabled. This guarantee applies to this package; a consumer's ndarray
constructor or bundler may have its own CSP requirements.
