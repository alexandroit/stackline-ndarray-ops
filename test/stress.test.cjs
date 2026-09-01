'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const ops = require('../ndarray-ops.js')
const upstream = require('ndarray-ops-upstream')
const { cloneView, sameStorage, view } = require('./helpers.cjs')

test('mixed-order block schedule crosses 64 and 128 boundaries exactly', () => {
  const shape = [2, 130]
  const destination = view(new Float64Array(260), shape, [130, 1], 0, 'float64', [1, 0])
  const right = view(new Float64Array(260).fill(1), shape, [130, 1], 0, 'float64', [1, 0])
  const log = []
  const values = new Float64Array(260).fill(2)
  const generic = {
    length: values.length,
    get(index) { log.push(index); return values[index] },
    set(index, value) { values[index] = value }
  }
  const left = view(generic, shape, [1, 2], 0, 'generic', [0, 1])
  ops.add(destination, left, right)
  assert.deepEqual(log.slice(0, 4), [132, 134, 136, 138])
  assert.deepEqual(log.slice(64, 68), [133, 135, 137, 139])
  assert.deepEqual(log.slice(-4), [0, 2, 1, 3])
})

test('rank 10,000 mixed order is iterative', () => {
  const rank = 10000
  const shape = new Array(rank).fill(1)
  const stride = new Array(rank).fill(0)
  const forward = Array.from({ length: rank }, (_, index) => index)
  const reverse = forward.slice().reverse()
  const destination = view(new Float64Array([0]), shape, stride, 0, 'float64', forward)
  const left = view(new Float64Array([1]), shape, stride, 0, 'float64', reverse)
  const right = view(new Float64Array([2]), shape, stride, 0, 'float64', forward)
  ops.add(destination, left, right)
  assert.equal(destination.data[0], 3)
})

test('large rank-1 and rank-3 scans produce upstream-identical storage', () => {
  const one = view(new Float64Array(500000).fill(1.25), [500000], [1], 0, 'float64', [0])
  const candidateOne = cloneView(one)
  const upstreamOne = cloneView(one)
  ops.mulseq(candidateOne, 2)
  upstream.mulseq(upstreamOne, 2)
  sameStorage(candidateOne.data, upstreamOne.data, 'large rank1')

  const shape = [64, 64, 64]
  const size = 64 ** 3
  const candidateDestination = view(new Float64Array(size), shape, [4096, 64, 1], 0, 'float64', [2, 1, 0])
  const candidateLeft = view(new Float64Array(size).fill(1), shape, [1, 64, 4096], 0, 'float64', [0, 1, 2])
  const candidateRight = view(new Float64Array(size).fill(2), shape, [4096, 1, 64], 0, 'float64', [1, 2, 0])
  const upstreamDestination = cloneView(candidateDestination)
  const upstreamLeft = cloneView(candidateLeft)
  const upstreamRight = cloneView(candidateRight)
  ops.add(candidateDestination, candidateLeft, candidateRight)
  upstream.add(upstreamDestination, upstreamLeft, upstreamRight)
  sameStorage(candidateDestination.data, upstreamDestination.data, 'large rank3')
})
