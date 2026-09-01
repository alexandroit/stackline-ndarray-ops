'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const candidate = require('../ndarray-ops.js')
const upstream = require('ndarray-ops-upstream')
const { cloneView, resultEqual, sameStorage, view } = require('./helpers.cjs')

const arithmetic = ['add', 'sub', 'mul', 'div', 'mod', 'band', 'bor', 'bxor', 'lshift', 'rshift', 'rrshift']
const binary = ['and', 'or', 'eq', 'neq', 'lt', 'gt', 'leq', 'geq', 'max', 'min', 'atan2', 'pow']
const unary = ['not', 'bnot', 'neg', 'recip', 'abs', 'acos', 'asin', 'atan', 'ceil', 'cos', 'exp', 'floor', 'log', 'round', 'sin', 'sqrt', 'tan']
const reverse = ['atan2', 'pow']
const reducers = ['any', 'all', 'sum', 'prod', 'norm2squared', 'norm2', 'norminf', 'norm1', 'sup', 'inf', 'argmin', 'argmax']

function fixture() {
  return {
    destination: view(new Float64Array(14).fill(-9), [2, 3], [5, -1], 7, 'float64', [1, 0]),
    left: view(new Float64Array([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5]), [2, 3], [1, 4], 1, 'float64', [0, 1]),
    right: view(new Float64Array([3, 2, 1, 0.5, -0.5, -1, 4, 5, 6, 7, 8, 9, 10, 11]), [2, 3], [-4, 1], 6, 'float64', [1, 0])
  }
}

function compareMutation(name, argumentBuilder) {
  const leftFixture = fixture()
  const rightFixture = {
    destination: cloneView(leftFixture.destination),
    left: cloneView(leftFixture.left),
    right: cloneView(leftFixture.right)
  }
  const candidateArguments = argumentBuilder(leftFixture)
  const upstreamArguments = argumentBuilder(rightFixture)
  const candidateResult = candidate[name](...candidateArguments)
  const upstreamResult = upstream[name](...upstreamArguments)
  assert.equal(candidateResult, leftFixture.destination, `${name} candidate destination return`)
  assert.equal(upstreamResult, rightFixture.destination, `${name} upstream destination return`)
  sameStorage(leftFixture.destination.data, rightFixture.destination.data, name)
}

test('all elementwise families match across mixed order, negative stride, and offset', () => {
  for (const name of arithmetic) {
    compareMutation(name, (x) => [x.destination, x.left, x.right])
    compareMutation(`${name}eq`, (x) => [x.destination, x.right])
    compareMutation(`${name}s`, (x) => [x.destination, x.left, 1.25])
    compareMutation(`${name}seq`, (x) => [x.destination, 1.25])
  }
  for (const name of binary) {
    compareMutation(name, (x) => [x.destination, x.left, x.right])
    compareMutation(`${name}s`, (x) => [x.destination, x.left, 1.25])
    compareMutation(`${name}eq`, (x) => [x.destination, x.right])
    compareMutation(`${name}seq`, (x) => [x.destination, 1.25])
  }
  for (const name of unary) {
    compareMutation(name, (x) => [x.destination, x.left])
    compareMutation(`${name}eq`, (x) => [x.destination])
  }
  for (const name of reverse) {
    compareMutation(`${name}op`, (x) => [x.destination, x.left, x.right])
    compareMutation(`${name}ops`, (x) => [x.destination, x.left, 1.25])
    compareMutation(`${name}opeq`, (x) => [x.destination, x.right])
    compareMutation(`${name}opseq`, (x) => [x.destination, 1.25])
  }
  compareMutation('assign', (x) => [x.destination, x.left])
  compareMutation('assigns', (x) => [x.destination, 4.25])
})

test('reducers and comparator preserve layout-sensitive order', () => {
  const rowMajor = view(new Float64Array([1e16, 1, -1e16, 1]), [2, 2], [2, 1], 0, 'float64', [1, 0])
  const columnMajor = view(new Float64Array([1e16, -1e16, 1, 1]), [2, 2], [1, 2], 0, 'float64', [0, 1])
  assert.equal(candidate.sum(rowMajor), upstream.sum(cloneView(rowMajor)))
  assert.equal(candidate.sum(columnMajor), upstream.sum(cloneView(columnMajor)))
  assert.equal(candidate.sum(rowMajor), 1)
  assert.equal(candidate.sum(columnMajor), 2)
  const source = fixture().left
  for (const name of reducers) resultEqual(candidate[name](source), upstream[name](cloneView(source)))
  assert.equal(candidate.equals(source, cloneView(source)), upstream.equals(source, cloneView(source)))
})

test('random captures Math.random once and follows layout traversal', () => {
  const original = Math.random
  const run = (implementation) => {
    let next = 0
    Math.random = () => ++next / 10
    const array = fixture().destination
    implementation.random(array)
    return array.data
  }
  try {
    sameStorage(run(candidate), run(upstream), 'random')
  } finally {
    Math.random = original
  }
})

test('Math functions are captured at call time and norm2 sqrt stays late-bound', () => {
  const originalAbs = Math.abs
  const originalSqrt = Math.sqrt
  const destination = view(new Float64Array(1), [1], [1], 0, 'float64', [0])
  const source = view(new Float64Array([4]), [1], [1], 0, 'float64', [0])
  try {
    Math.abs = () => 77
    candidate.abs(destination, source)
    assert.equal(destination.data[0], 77)
    Math.sqrt = () => 925
    assert.equal(candidate.norm2(source), 925)
  } finally {
    Math.abs = originalAbs
    Math.sqrt = originalSqrt
  }
})

test('generic get/set ordering and logical short circuit match cwise', () => {
  function generic(values, log, label) {
    return {
      length: values.length,
      get(index) { log.push(`${label}.get:${index}`); return values[index] },
      set(index, value) { log.push(`${label}.set:${index}:${value}`); values[index] = value }
    }
  }
  function run(implementation, operation, leftValue) {
    const log = []
    const destination = view(generic([9], log, 'd'), [1], [1], 0, 'generic', [0])
    const left = view(generic([leftValue], log, 'l'), [1], [1], 0, 'generic', [0])
    const right = view(generic([5], log, 'r'), [1], [1], 0, 'generic', [0])
    implementation[operation](destination, left, right)
    return log
  }
  assert.deepEqual(run(candidate, 'add', 1), run(upstream, 'add', 1))
  assert.deepEqual(run(candidate, 'and', 0), run(upstream, 'and', 0))
  assert.deepEqual(run(candidate, 'or', 1), run(upstream, 'or', 1))
})
