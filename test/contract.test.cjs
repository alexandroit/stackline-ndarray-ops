'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const ours = require('../ndarray-ops.js')
const deep = require('../ndarray-ops.js')
const upstream = require('ndarray-ops-upstream')
const { view } = require('./helpers.cjs')

test('exact enumerable API order, function arity, and diagnostic names', () => {
  assert.equal(deep, ours)
  assert.equal(Object.keys(ours).length, 150)
  assert.deepEqual(Object.keys(ours), Object.keys(upstream))
  for (const name of Object.keys(upstream)) {
    assert.equal(ours[name].length, upstream[name].length, `${name} arity`)
    assert.equal(ours[name].name, upstream[name].name, `${name} name`)
  }
  assert.equal(Object.hasOwn(ours, 'default'), false)
})

test('all 137 mutators return destination identity', () => {
  const reducers = new Set(['any', 'all', 'sum', 'prod', 'norm2squared', 'norm2', 'norminf', 'norm1', 'sup', 'inf', 'argmin', 'argmax', 'equals'])
  const scalarNames = new Set(['assigns'])
  for (const family of ['add', 'sub', 'mul', 'div', 'mod', 'band', 'bor', 'bxor', 'lshift', 'rshift', 'rrshift', 'and', 'or', 'eq', 'neq', 'lt', 'gt', 'leq', 'geq', 'max', 'min', 'atan2', 'pow']) {
    scalarNames.add(`${family}s`)
    scalarNames.add(`${family}seq`)
  }
  for (const family of ['atan2', 'pow']) {
    scalarNames.add(`${family}ops`)
    scalarNames.add(`${family}opseq`)
  }
  for (const name of Object.keys(ours)) {
    if (reducers.has(name)) continue
    const destination = view(new Float64Array([1]), [1], [1], 0, 'float64', [0])
    const source = view(new Float64Array([2]), [1], [1], 0, 'float64', [0])
    const third = view(new Float64Array([3]), [1], [1], 0, 'float64', [0])
    let args
    if (name === 'random') args = [destination]
    else if (name === 'assigns') args = [destination, 2]
    else if (name === 'assign') args = [destination, source]
    else if (ours[name].length === 1) args = [destination]
    else if (ours[name].length === 2) args = scalarNames.has(name) ? [destination, 2] : [destination, source]
    else args = scalarNames.has(name) ? [destination, source, 2] : [destination, source, third]
    assert.equal(ours[name](...args), destination, name)
  }
})

test('shape errors retain cwise messages and equals throws', () => {
  const one = view(new Float64Array(2), [2], [1], 0, 'float64', [0])
  const rankTwo = view(new Float64Array(2), [1, 2], [2, 1], 0, 'float64', [1, 0])
  const three = view(new Float64Array(3), [3], [1], 0, 'float64', [0])
  assert.throws(() => ours.add(one, one, rankTwo), /same dimensionality/)
  assert.throws(() => ours.equals(one, three), /same shape/)
})
