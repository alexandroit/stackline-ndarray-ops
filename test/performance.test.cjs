'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const candidate = require('../ndarray-ops.js')
const upstream = require('ndarray-ops-upstream')
const { view } = require('./helpers.cjs')

const ELEMENTS = 250000
const BATCH = 100
const SAMPLES = 9

function median(values) {
  return values.slice().sort((left, right) => left - right)[Math.floor(values.length / 2)]
}

function measure(operation) {
  for (let warm = 0; warm < 30; ++warm) operation()
  const samples = []
  for (let sample = 0; sample < SAMPLES; ++sample) {
    const start = process.hrtime.bigint()
    for (let iteration = 0; iteration < BATCH; ++iteration) operation()
    samples.push(Number(process.hrtime.bigint() - start) / 1e6 / BATCH)
  }
  return median(samples)
}

function layout(shape, stride, fill) {
  return view(new Float64Array(ELEMENTS).fill(fill), shape, stride, 0, 'float64', stride.map((value, index) => [Math.abs(value), index]).sort((a, b) => a[0] - b[0]).map((term) => term[1]))
}

function casesFor(implementation) {
  const oneDestination = layout([ELEMENTS], [1], 0)
  const oneLeft = layout([ELEMENTS], [1], 1)
  const oneRight = layout([ELEMENTS], [1], 2)
  const twoDestination = layout([500, 500], [500, 1], 0)
  const twoSource = layout([500, 500], [1, 500], 1)
  const twoRight = layout([500, 500], [500, 1], 2)
  const threeDestination = layout([50, 50, 100], [5000, 100, 1], 0)
  const threeSource = layout([50, 50, 100], [1, 50, 2500], 1)
  const threeRight = layout([50, 50, 100], [5000, 1, 50], 2)
  return {
    'rank1 add': () => implementation.add(oneDestination, oneLeft, oneRight),
    'rank1 assigns': () => implementation.assigns(oneDestination, 3),
    'rank1 sum': () => implementation.sum(oneLeft),
    'rank2 mixed add': () => implementation.add(twoDestination, twoSource, twoRight),
    'rank2 mixed assign': () => implementation.assign(twoDestination, twoSource),
    'rank2 assigns': () => implementation.assigns(twoDestination, 3),
    'rank2 abs': () => implementation.abs(twoDestination, twoSource),
    'rank2 neg': () => implementation.neg(twoDestination, twoSource),
    'rank2 sum': () => implementation.sum(twoSource),
    'rank3 mixed add': () => implementation.add(threeDestination, threeSource, threeRight),
    'rank3 mixed assign': () => implementation.assign(threeDestination, threeSource),
    'rank3 assigns': () => implementation.assigns(threeDestination, 3),
    'rank3 abs': () => implementation.abs(threeDestination, threeSource),
    'rank3 neg': () => implementation.neg(threeDestination, threeSource),
    'rank3 sum': () => implementation.sum(threeSource)
  }
}

test('batched warm throughput stays within 5x upstream and 50ms per call', () => {
  const candidateCases = casesFor(candidate)
  const upstreamCases = casesFor(upstream)
  const matrix = []
  for (const name of Object.keys(candidateCases)) {
    const candidateMilliseconds = measure(candidateCases[name])
    const upstreamMilliseconds = measure(upstreamCases[name])
    const ratio = candidateMilliseconds / Math.max(upstreamMilliseconds, 0.02)
    matrix.push({ name, candidateMilliseconds, upstreamMilliseconds, ratio })
    assert.ok(candidateMilliseconds < 50, `${name}: ${candidateMilliseconds.toFixed(3)}ms exceeds 50ms`)
    assert.ok(ratio <= 5, `${name}: ${ratio.toFixed(2)}x exceeds 5x (${candidateMilliseconds.toFixed(3)}ms / ${upstreamMilliseconds.toFixed(3)}ms)`)
  }
  process.stdout.write(`${JSON.stringify(matrix, null, 2)}\n`)
})
