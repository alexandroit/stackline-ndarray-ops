'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const artifactDirectory = path.resolve(process.argv[2] || 'artifact')
const archives = fs.readdirSync(artifactDirectory).filter((entry) => /\.tgz$/.test(entry))
assert.equal(archives.length, 1, 'expected exactly one packed artifact')
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'stackline-ndarray-ops-packed-'))

try {
  fs.writeFileSync(path.join(workspace, 'package.json'), `${JSON.stringify({ private: true }, null, 2)}\n`)
  const installed = spawnSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', path.join(artifactDirectory, archives[0])], {
    cwd: workspace,
    shell: process.platform === 'win32',
    stdio: 'inherit'
  })
  if (installed.error) throw installed.error
  if (installed.status !== 0) process.exit(installed.status || 1)

  const ops = require(path.join(workspace, 'node_modules', '@stackline', 'ndarray-ops'))
  const deep = require(path.join(workspace, 'node_modules', '@stackline', 'ndarray-ops', 'ndarray-ops.js'))
  const source = {
    data: new Float64Array([1, 2, 3, 4]),
    shape: [2, 2],
    stride: [2, 1],
    offset: 0,
    dtype: 'float64',
    order: [1, 0]
  }
  const destination = {
    data: new Float64Array(4),
    shape: [2, 2],
    stride: [1, 2],
    offset: 0,
    dtype: 'float64',
    order: [0, 1]
  }
  assert.equal(ops, deep)
  assert.equal(ops.assign(destination, source), destination)
  assert.deepEqual(Array.from(destination.data), [1, 3, 2, 4])
  assert.equal(ops.sum(destination), 10)
  assert.equal(Object.hasOwn(ops, 'default'), false)

  const csp = spawnSync(process.execPath, ['--disallow-code-generation-from-strings', '-e', "const o=require('@stackline/ndarray-ops');const a={data:new Float64Array([2]),shape:[],stride:[],offset:0,dtype:'float64',order:[]};if(o.sum(a)!==2)process.exit(1)"], {
    cwd: workspace,
    stdio: 'inherit'
  })
  if (csp.error) throw csp.error
  assert.equal(csp.status, 0)

  const listed = spawnSync('npm', ['ls', '--all'], {
    cwd: workspace,
    shell: process.platform === 'win32',
    stdio: 'inherit'
  })
  if (listed.error) throw listed.error
  assert.equal(listed.status, 0)
  process.stdout.write(`${JSON.stringify({ node: process.version, platform: process.platform, status: 'pass' })}\n`)
} finally {
  fs.rmSync(workspace, { force: true, recursive: true })
}
