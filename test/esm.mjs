import assert from 'node:assert/strict'
import operations, { add, argmin, sum } from '../index.mjs'

assert.equal(Object.keys(operations).length, 150)
assert.equal(operations.add, add)
assert.equal(operations.sum, sum)
assert.equal(Object.hasOwn(operations, 'default'), false)
const view = (data) => ({ data: new Float64Array(data), shape: [data.length], stride: [1], offset: 0, dtype: 'float64', order: [0] })
const destination = view([0, 0])
add(destination, view([1, 2]), view([3, 4]))
assert.deepEqual(Array.from(destination.data), [4, 6])
assert.equal(sum(destination), 10)
assert.deepEqual(argmin(destination), [0])
