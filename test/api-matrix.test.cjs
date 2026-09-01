'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const candidate = require('../ndarray-ops.js')
const upstream = require('ndarray-ops-upstream')
const { cloneView, makeLayout, resultEqual, sameStorage } = require('./helpers.cjs')

const valueFunctions = new Set(['any', 'all', 'sum', 'prod', 'norm2squared', 'norm2', 'norminf', 'norm1', 'sup', 'inf', 'argmin', 'argmax', 'equals'])
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
  if (name === 'equals') return implementation.equals(left, right)
  if (valueFunctions.has(name)) return implementation[name](left)
  if (name === 'assign') return implementation.assign(destination, left)
  if (name === 'assigns') return implementation.assigns(destination, 1.25)
  if (implementation[name].length === 1) return implementation[name](destination)
  if (implementation[name].length === 2) return scalarFunctions.has(name) ? implementation[name](destination, 1.25) : implementation[name](destination, left)
  return scalarFunctions.has(name) ? implementation[name](destination, left, 1.25) : implementation[name](destination, left, right)
}

function shapeForCase(index) {
  const shapes = [[], [0], [1], [2], [5], [64], [65], [130], [0, 3], [2, 3], [3, 2], [2, 65], [65, 2], [2, 2, 2], [2, 3, 4], [1, 65, 2], [2, 2, 2, 2], [1, 2, 3, 2]]
  return shapes[index % shapes.length]
}

test('5,364 deterministic all-API layout checks match upstream', () => {
  const names = Object.keys(candidate).filter((name) => name !== 'random')
  assert.equal(names.length, 149)
  let checks = 0
  for (let caseIndex = 0; caseIndex < 36; ++caseIndex) {
    const shape = shapeForCase(caseIndex)
    const rank = shape.length
    const forward = Array.from({ length: rank }, (_, index) => index)
    const reverse = forward.slice().reverse()
    const signs = Array.from({ length: rank }, (_, index) => (caseIndex + index) % 3 === 0 ? -1 : 1)
    for (const name of names) {
      const destination = makeLayout(shape, caseIndex % 2 ? reverse : forward, signs, caseIndex + 1)
      const left = makeLayout(shape, caseIndex % 3 ? forward : reverse, signs.slice().reverse(), caseIndex + 5)
      const right = makeLayout(shape, caseIndex % 4 ? reverse : forward, signs.map((value, index) => index % 2 ? -value : value), caseIndex + 9)
      const candidateDestination = cloneView(destination)
      const candidateLeft = cloneView(left)
      const candidateRight = cloneView(right)
      const upstreamDestination = cloneView(destination)
      const upstreamLeft = cloneView(left)
      const upstreamRight = cloneView(right)
      const candidateResult = invoke(candidate, name, candidateDestination, candidateLeft, candidateRight)
      const upstreamResult = invoke(upstream, name, upstreamDestination, upstreamLeft, upstreamRight)
      if (valueFunctions.has(name)) resultEqual(candidateResult, upstreamResult)
      else {
        assert.equal(candidateResult, candidateDestination, `${name} candidate identity`)
        assert.equal(upstreamResult, upstreamDestination, `${name} upstream identity`)
        sameStorage(candidateDestination.data, upstreamDestination.data, `${name} case ${caseIndex}`)
      }
      ++checks
    }
  }
  assert.equal(checks, 5364)
})
