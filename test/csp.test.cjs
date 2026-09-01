'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const path = require('node:path')

test('CJS and ESM execute with string code generation prohibited', () => {
  const root = path.resolve(__dirname, '..')
  const commonjs = [
    "const ops=require('./ndarray-ops.js')",
    "const v=(data)=>({data:new Float64Array(data),shape:[data.length],stride:[1],offset:0,dtype:'float64',order:[0]})",
    "const d=v([0,0,0]),a=v([1,2,3]),b=v([4,5,6])",
    "ops.add(d,a,b)",
    "if(ops.sum(d)!==21||d.data.join()!=='5,7,9')process.exit(2)"
  ].join(';')
  const cjsResult = spawnSync(process.execPath, ['--disallow-code-generation-from-strings', '-e', commonjs], { cwd: root, encoding: 'utf8' })
  assert.equal(cjsResult.status, 0, cjsResult.stderr)
  const esm = "import ops,{sum} from './index.mjs';const a={data:new Float64Array([1]),shape:[],stride:[],offset:0,dtype:'float64',order:[]};if(ops.sum(a)!==1||sum(a)!==1)process.exit(2)"
  const esmResult = spawnSync(process.execPath, ['--disallow-code-generation-from-strings', '--input-type=module', '-e', esm], { cwd: root, encoding: 'utf8' })
  assert.equal(esmResult.status, 0, esmResult.stderr)
})
