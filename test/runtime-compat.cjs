'use strict'

const assert = require('node:assert/strict')
const ops = require('../ndarray-ops.js')

const major = Number(process.versions.node.split('.')[0])
assert.ok(major >= 18, `Node ${process.versions.node} is below the supported floor`)
const array = {
  data: new Float64Array([1, 2, 3, 4]),
  shape: [2, 2],
  stride: [2, 1],
  offset: 0,
  dtype: 'float64',
  order: [1, 0]
}
assert.equal(ops.mulseq(array, 2), array)
assert.deepEqual(Array.from(array.data), [2, 4, 6, 8])
assert.equal(ops.sum(array), 20)
console.log(`Node ${process.versions.node}: CJS/layout smoke passed.`)
