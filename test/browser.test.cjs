'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')

const source = readFileSync(path.resolve(__dirname, '../browser.js'), 'utf8')

test('classic browser global runs with Function construction disabled', () => {
  const context = { Float64Array, globalThis: null }
  context.globalThis = context
  context.Function = function ForbiddenFunction() { throw new Error('blocked') }
  vm.runInNewContext(source, context, { filename: 'browser.js' })
  assert.equal(Object.keys(context.ndarrayOps).length, 150)
  const array = { data: new Float64Array([1, 2]), shape: [2], stride: [1], offset: 0, dtype: 'float64', order: [0] }
  assert.equal(context.ndarrayOps.sum(array), 3)
})

test('AMD receives the same plain operation object', () => {
  let received
  const define = (dependencies, factory) => {
    assert.equal(Array.isArray(dependencies), true)
    assert.equal(dependencies.length, 0)
    received = factory()
  }
  define.amd = {}
  const context = { define, Float64Array, globalThis: null }
  context.globalThis = context
  vm.runInNewContext(source, context)
  assert.equal(Object.keys(received).length, 150)
  assert.equal(Object.hasOwn(received, 'default'), false)
})
