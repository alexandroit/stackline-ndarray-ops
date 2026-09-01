'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { spawnSync } = require('node:child_process')
const path = require('node:path')
const ops = require('../ndarray-ops.js')
const { view } = require('./helpers.cjs')

const root = path.resolve(__dirname, '..')

test('malformed metadata is rejected synchronously before traversal', () => {
  const valid = () => view(new Float64Array(4), [2], [1], 0, 'float64', [0])
  for (const extent of [NaN, Infinity, -1, 1.5, 2147483648]) {
    const array = valid()
    array.shape[0] = extent
    assert.throws(() => ops.sum(array), RangeError)
  }
  for (const stride of [NaN, Infinity, 1.5, 2147483648, -2147483649]) {
    const array = valid()
    array.stride[0] = stride
    assert.throws(() => ops.sum(array), RangeError)
  }
  for (const offset of [NaN, Infinity, 1.5, 2147483648, -2147483649]) {
    const array = valid()
    array.offset = offset
    assert.throws(() => ops.sum(array), RangeError)
  }
  const duplicateOrder = view(new Float64Array(4), [2, 2], [2, 1], 0, 'float64', [0, 0])
  assert.throws(() => ops.sum(duplicateOrder), /Order/)
  const missingOrder = valid()
  delete missingOrder.order
  assert.throws(() => ops.sum(missingOrder), /Order/)
  const arrayLikeShape = valid()
  arrayLikeShape.shape = new Int32Array([2])
  assert.throws(() => ops.sum(arrayLikeShape), /ndarray-compatible/)
})

test('non-finite data remains valid and empty/rank-zero/zero/negative strides remain valid', () => {
  const values = view(new Float64Array([NaN, Infinity, -Infinity]), [3], [1], 0, 'float64', [0])
  assert.ok(Number.isNaN(ops.sum(values)))
  const zeroStride = view(new Float64Array([2]), [4], [0], 0, 'float64', [0])
  ops.addseq(zeroStride, 1)
  assert.equal(zeroStride.data[0], 6)
  const negative = view(new Float64Array([1, 2, 3]), [3], [-1], 2, 'float64', [0])
  assert.equal(ops.sum(negative), 6)
  const scalar = view(new Float64Array([5]), [], [], 0, 'float64', [])
  assert.equal(ops.sum(scalar), 5)
  const empty = view(new Float64Array(0), [0], [1], 0, 'float64', [0])
  assert.equal(ops.sum(empty), 0)
  const omittedOffset = view(new Float64Array([7]), [1], [1], 0, 'float64', [0])
  delete omittedOffset.offset
  assert.equal(ops.sum(omittedOffset), 7)
})

test('non-finite child probes cannot hang', () => {
  const source = [
    "const ops=require('./ndarray-ops.js')",
    "for(const value of [NaN,Infinity,2147483648]){",
    "const a={data:new Float64Array(1),shape:[value],stride:[0],offset:0,dtype:'float64',order:[0]};",
    "try{ops.assigns(a,1);process.exitCode=2}catch(error){if(!(error instanceof RangeError))throw error}",
    "}"
  ].join(';')
  const result = spawnSync(process.execPath, ['-e', source], { cwd: root, encoding: 'utf8', timeout: 2000 })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.signal, null)
})

test('production source contains no string-code-generation primitive', () => {
  for (const filename of ['ndarray-ops.js', 'index.mjs']) {
    const source = readFileSync(path.join(root, filename), 'utf8')
    assert.doesNotMatch(source, /\bnew\s+Function\b|\beval\s*\(/)
  }
})
