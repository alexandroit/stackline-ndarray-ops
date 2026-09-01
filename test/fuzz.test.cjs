'use strict'

const test = require('node:test')
const candidate = require('../ndarray-ops.js')
const upstream = require('ndarray-ops-upstream')
const { cloneView, makeLayout, resultEqual, sameStorage, view } = require('./helpers.cjs')

let state = 0x6d2b79f5
function random() {
  state = (Math.imul(state ^ (state >>> 15), 1 | state) + 0x6d2b79f5) | 0
  return ((state ^ (state >>> 14)) >>> 0) / 4294967296
}

function permutation(rank) {
  const result = Array.from({ length: rank }, (_, index) => index)
  for (let i = rank - 1; i > 0; --i) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

test('400 deterministic valid-layout cases match upstream', () => {
  for (let iteration = 0; iteration < 400; ++iteration) {
    const rank = iteration % 5
    const shape = Array.from({ length: rank }, () => Math.floor(random() * 5))
    const signs = Array.from({ length: rank }, () => random() < 0.35 ? -1 : 1)
    const destination = makeLayout(shape, permutation(rank), signs, iteration + 1)
    const left = makeLayout(shape, permutation(rank), signs.map((value, index) => index % 2 ? -value : value), iteration + 7)
    const right = makeLayout(shape, permutation(rank), signs.slice().reverse(), iteration + 13)
    const candidateDestination = cloneView(destination)
    const candidateLeft = cloneView(left)
    const candidateRight = cloneView(right)
    const upstreamDestination = cloneView(destination)
    const upstreamLeft = cloneView(left)
    const upstreamRight = cloneView(right)
    candidate.add(candidateDestination, candidateLeft, candidateRight)
    upstream.add(upstreamDestination, upstreamLeft, upstreamRight)
    sameStorage(candidateDestination.data, upstreamDestination.data, `add fuzz ${iteration}`)
    resultEqual(candidate.sum(candidateLeft), upstream.sum(upstreamLeft))
    resultEqual(candidate.argmin(candidateLeft), upstream.argmin(upstreamLeft))
    resultEqual(candidate.argmax(candidateLeft), upstream.argmax(upstreamLeft))
    resultEqual(candidate.equals(candidateLeft, candidateRight), upstream.equals(upstreamLeft, upstreamRight))
  }
})

test('500 shared-buffer overlap cases preserve upstream clobber order', () => {
  for (let iteration = 0; iteration < 500; ++iteration) {
    const candidateData = new Float64Array(48)
    for (let i = 0; i < candidateData.length; ++i) candidateData[i] = i + iteration / 10
    const upstreamData = new Float64Array(candidateData)
    const reverse = iteration % 2 === 1
    const destinationOffset = reverse ? 30 : 1
    const destinationStride = reverse ? -1 : 1
    const sourceOffset = reverse ? 29 : 0
    const sourceStride = reverse ? -1 : 1
    const candidateDestination = view(candidateData, [20], [destinationStride], destinationOffset, 'float64', [0])
    const candidateSource = view(candidateData, [20], [sourceStride], sourceOffset, 'float64', [0])
    const upstreamDestination = view(upstreamData, [20], [destinationStride], destinationOffset, 'float64', [0])
    const upstreamSource = view(upstreamData, [20], [sourceStride], sourceOffset, 'float64', [0])
    if (iteration % 3 === 0) {
      candidate.assign(candidateDestination, candidateSource)
      upstream.assign(upstreamDestination, upstreamSource)
    } else {
      candidate.add(candidateDestination, candidateDestination, candidateSource)
      upstream.add(upstreamDestination, upstreamDestination, upstreamSource)
    }
    sameStorage(candidateData, upstreamData, `alias fuzz ${iteration}`)
  }
})
