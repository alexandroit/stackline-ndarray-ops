'use strict'

const assert = require('node:assert/strict')

function orderFromStride(stride) {
  return stride.map((value, index) => [Math.abs(value), index])
    .sort((left, right) => left[0] - right[0])
    .map((term) => term[1])
}

function view(data, shape, stride, offset, dtype, order) {
  return {
    data,
    shape: shape.slice(),
    stride: stride.slice(),
    offset: offset === undefined ? 0 : offset,
    dtype: dtype || (data instanceof Float64Array ? 'float64' : 'array'),
    order: order ? order.slice() : orderFromStride(stride)
  }
}

function cloneData(data) {
  if (Array.isArray(data)) return data.slice()
  return new data.constructor(data)
}

function cloneView(array) {
  return view(cloneData(array.data), array.shape, array.stride, array.offset, array.dtype, array.order)
}

function sameStorage(actual, expected, message) {
  assert.equal(actual.length, expected.length, message)
  for (let i = 0; i < actual.length; ++i) {
    assert.ok(Object.is(actual[i], expected[i]) || (Number.isNaN(actual[i]) && Number.isNaN(expected[i])), `${message || 'storage'} at ${i}: ${actual[i]} !== ${expected[i]}`)
  }
}

function makeLayout(shape, permutation, signs, seed) {
  const rank = shape.length
  const strides = new Array(rank)
  let stride = 1
  for (let i = 0; i < rank; ++i) {
    const dimension = permutation[i]
    strides[dimension] = stride * (signs[dimension] || 1)
    stride *= Math.max(1, shape[dimension]) + ((seed + i) % 2)
  }
  let minimum = 0
  let maximum = 0
  for (let i = 0; i < rank; ++i) {
    const extent = Math.max(0, shape[i] - 1) * strides[i]
    minimum += Math.min(0, extent)
    maximum += Math.max(0, extent)
  }
  const offset = 2 - minimum
  const data = new Float64Array(Math.max(5, maximum - minimum + 5))
  for (let i = 0; i < data.length; ++i) data[i] = ((i * 17 + seed * 13) % 29) / 7 - 2
  return view(data, shape, strides, offset, 'float64', orderFromStride(strides))
}

function resultEqual(actual, expected) {
  if (Array.isArray(actual) || ArrayBuffer.isView(actual)) {
    assert.deepEqual(Array.from(actual), Array.from(expected))
  } else if (Number.isNaN(actual) && Number.isNaN(expected)) {
    assert.ok(true)
  } else {
    assert.ok(Object.is(actual, expected), `${actual} !== ${expected}`)
  }
}

module.exports = { cloneView, makeLayout, orderFromStride, resultEqual, sameStorage, view }
