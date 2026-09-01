'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const candidate = require('../ndarray-ops.js')
const upstream = require('ndarray-ops-upstream')
const { orderFromStride, sameStorage, view } = require('./helpers.cjs')

const excluded = new Set(['random', 'any', 'all', 'sum', 'prod', 'norm2squared', 'norm2', 'norminf', 'norm1', 'sup', 'inf', 'argmin', 'argmax', 'equals'])
const scalarFunctions = new Set(['assigns'])
for (const family of ['add', 'sub', 'mul', 'div', 'mod', 'band', 'bor', 'bxor', 'lshift', 'rshift', 'rrshift', 'and', 'or', 'eq', 'neq', 'lt', 'gt', 'leq', 'geq', 'max', 'min', 'atan2', 'pow']) {
  scalarFunctions.add(`${family}s`)
  scalarFunctions.add(`${family}seq`)
}
for (const family of ['atan2', 'pow']) {
  scalarFunctions.add(`${family}ops`)
  scalarFunctions.add(`${family}opseq`)
}

function invoke(implementation, name, destination, left, right) {
  if (name === 'assign') return implementation.assign(destination, left)
  if (name === 'assigns') return implementation.assigns(destination, 1.25)
  if (implementation[name].length === 1) return implementation[name](destination)
  if (implementation[name].length === 2) return scalarFunctions.has(name) ? implementation[name](destination, 1.25) : implementation[name](destination, left)
  return scalarFunctions.has(name) ? implementation[name](destination, left, 1.25) : implementation[name](destination, left, right)
}

function strides(rank, variant) {
  if (rank === 1) return [variant % 3 === 0 ? 0 : variant % 2 ? -1 : 1]
  if (rank === 2) return [[4, 1], [1, 4], [-4, 1], [0, 1]][variant % 4].slice()
  return [[8, 4, 1], [1, 4, 8], [-8, 4, 1], [0, 4, 1], [8, 0, 1]][variant % 5].slice()
}

function offsetFor(stride) {
  let negative = 0
  for (const value of stride) if (value < 0) negative += -value
  return 40 + negative
}

test('12,240 shared-buffer all-mutator alias checks match upstream', () => {
  const names = Object.keys(candidate).filter((name) => !excluded.has(name))
  assert.equal(names.length, 136)
  let checks = 0
  for (let rank = 1; rank <= 3; ++rank) {
    const shape = new Array(rank).fill(2)
    for (let variant = 0; variant < 30; ++variant) {
      const destinationStride = strides(rank, variant)
      const leftStride = strides(rank, variant + 1)
      const rightStride = strides(rank, variant + 2)
      for (const name of names) {
        const candidateData = new Float64Array(128)
        for (let i = 0; i < candidateData.length; ++i) candidateData[i] = ((i + variant) % 17) / 4 + 0.25
        const upstreamData = new Float64Array(candidateData)
        const candidateDestination = view(candidateData, shape, destinationStride, offsetFor(destinationStride), 'float64', orderFromStride(destinationStride))
        const candidateLeft = view(candidateData, shape, leftStride, offsetFor(leftStride) + (variant % 3) - 1, 'float64', orderFromStride(leftStride))
        const candidateRight = view(candidateData, shape, rightStride, offsetFor(rightStride) + (variant % 2), 'float64', orderFromStride(rightStride))
        const upstreamDestination = view(upstreamData, shape, destinationStride, candidateDestination.offset, 'float64', candidateDestination.order)
        const upstreamLeft = view(upstreamData, shape, leftStride, candidateLeft.offset, 'float64', candidateLeft.order)
        const upstreamRight = view(upstreamData, shape, rightStride, candidateRight.offset, 'float64', candidateRight.order)
        assert.equal(invoke(candidate, name, candidateDestination, candidateLeft, candidateRight), candidateDestination)
        assert.equal(invoke(upstream, name, upstreamDestination, upstreamLeft, upstreamRight), upstreamDestination)
        sameStorage(candidateData, upstreamData, `${name} rank${rank} variant${variant}`)
        ++checks
      }
    }
  }
  assert.equal(checks, 12240)
})
