import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const metadata = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const temporary = await mkdtemp(path.join(os.tmpdir(), 'stackline-ndarray-ops-smoke-'))
let tarball
let server

function runSync(command, arguments_, cwd) {
  return spawnSync(command, arguments_, { cwd, encoding: 'utf8', env: { ...process.env, NO_UPDATE_NOTIFIER: '1' } })
}

function run(command, arguments_, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, arguments_, { cwd, env: { ...process.env, NO_UPDATE_NOTIFIER: '1' } })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('close', (status) => resolve({ status, stdout, stderr }))
  })
}

try {
  const packed = runSync('npm', ['pack', '--silent', '--json', '--ignore-scripts'], root)
  assert.equal(packed.status, 0, packed.stderr)
  const record = JSON.parse(packed.stdout.slice(packed.stdout.lastIndexOf('\n[') + 1))[0]
  tarball = path.join(root, record.filename)
  const tarballBytes = await readFile(tarball)
  const packedPaths = record.files.map((file) => file.path)
  for (const required of ['LICENSE', 'NOTICE', 'THIRD_PARTY_LICENSES.md', 'licenses/DefinitelyTyped-ndarray-ops-MIT.txt', 'ndarray-ops.js', 'browser.js', 'index.mjs', 'index.d.ts', 'index.d.cts', 'index.d.mts', 'index.named.d.ts']) {
    assert.equal(packedPaths.includes(required), true, `missing ${required}`)
  }
  assert.equal(packedPaths.some((file) => /^(scripts|test|release-candidate)\//.test(file)), false)

  const direct = path.join(temporary, 'direct')
  await mkdir(direct)
  await writeFile(path.join(direct, 'package.json'), `${JSON.stringify({ private: true, dependencies: { [metadata.name]: `file:${tarball}` } }, null, 2)}\n`)
  const directInstall = runSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], direct)
  assert.equal(directInstall.status, 0, directInstall.stdout + directInstall.stderr)
  assert.doesNotMatch(directInstall.stdout + directInstall.stderr, /warn|deprecated|invalid|extraneous/i)
  const cjs = runSync(process.execPath, ['--disallow-code-generation-from-strings', '--input-type=commonjs', '-e', [
    "const ops=require('@stackline/ndarray-ops')",
    "const deep=require('@stackline/ndarray-ops/ndarray-ops.js')",
    "const a={data:new Float64Array([1,2]),shape:[2],stride:[1],offset:0,dtype:'float64',order:[0]}",
    "if(ops!==deep||ops.sum(a)!==3||Object.hasOwn(ops,'default'))process.exit(2)"
  ].join(';')], direct)
  assert.equal(cjs.status, 0, cjs.stderr)
  const esm = runSync(process.execPath, ['--input-type=module', '-e', "import ops,{add,sum} from '@stackline/ndarray-ops';import deep,{sum as deepSum} from '@stackline/ndarray-ops/ndarray-ops.js';if(ops.add!==add||sum!==deepSum||deep!==ops||Object.hasOwn(ops,'default'))process.exit(2)"], direct)
  assert.equal(esm.status, 0, esm.stderr)
  const browserCondition = runSync(process.execPath, ['--conditions=browser', '--input-type=module', '-e', "import ops,{add,sum} from '@stackline/ndarray-ops';import deep,{sum as deepSum} from '@stackline/ndarray-ops/ndarray-ops.js';if(ops.add!==add||sum!==deepSum||deep!==ops)process.exit(2)"], direct)
  assert.equal(browserCondition.status, 0, browserCondition.stderr)
  const listed = runSync('npm', ['ls', '--all', '--json'], direct)
  assert.equal(listed.status, 0, listed.stdout + listed.stderr)
  assert.deepEqual(JSON.parse(listed.stdout).problems || [], [])
  const audited = runSync('npm', ['audit', '--json'], direct)
  assert.equal(audited.status, 0, audited.stdout + audited.stderr)
  assert.equal(JSON.parse(audited.stdout).metadata.vulnerabilities.total, 0)

  server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    if (pathname.endsWith('.tgz')) {
      response.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': tarballBytes.length })
      response.end(tarballBytes)
      return
    }
    if (pathname === '/@stackline/ndarray-ops') {
      const address = server.address()
      const version = {
        ...metadata,
        _id: `${metadata.name}@${metadata.version}`,
        dist: {
          integrity: record.integrity,
          shasum: record.shasum,
          tarball: `http://127.0.0.1:${address.port}/@stackline/ndarray-ops/-/${record.filename}`
        }
      }
      const body = Buffer.from(JSON.stringify({ name: metadata.name, 'dist-tags': { latest: metadata.version }, versions: { [metadata.version]: version } }))
      response.writeHead(200, { 'content-type': 'application/json', 'content-length': body.length })
      response.end(body)
      return
    }
    response.writeHead(404)
    response.end('{}')
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const alias = path.join(temporary, 'alias')
  await mkdir(alias)
  await writeFile(path.join(alias, 'package.json'), `${JSON.stringify({ private: true, dependencies: { 'ndarray-ops': 'npm:@stackline/ndarray-ops@1.0.1' } }, null, 2)}\n`)
  const registry = `http://127.0.0.1:${server.address().port}`
  const aliasInstall = await run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--registry', registry], alias)
  assert.equal(aliasInstall.status, 0, aliasInstall.stdout + aliasInstall.stderr)
  assert.doesNotMatch(aliasInstall.stdout + aliasInstall.stderr, /warn|deprecated|invalid|extraneous/i)
  const aliasCjs = runSync(process.execPath, ['--disallow-code-generation-from-strings', '-e', "const ops=require('ndarray-ops');const deep=require('ndarray-ops/ndarray-ops.js');const a={data:new Float64Array([2]),shape:[],stride:[],offset:0,dtype:'float64',order:[]};if(ops!==deep||ops.sum(a)!==2)process.exit(2)"], alias)
  assert.equal(aliasCjs.status, 0, aliasCjs.stderr)
  const aliasManifest = JSON.parse(await readFile(path.join(alias, 'node_modules', 'ndarray-ops', 'package.json'), 'utf8'))
  assert.equal(aliasManifest.name, '@stackline/ndarray-ops')
  assert.deepEqual(aliasManifest.dependencies, {})
  const aliasList = runSync('npm', ['ls', '--all', '--json'], alias)
  assert.equal(aliasList.status, 0, aliasList.stdout + aliasList.stderr)
  assert.deepEqual(JSON.parse(aliasList.stdout).problems || [], [])
} finally {
  if (server) await new Promise((resolve) => server.close(resolve))
  if (tarball) await rm(tarball, { force: true })
  await rm(temporary, { force: true, recursive: true })
}

console.log('Exact packed scoped and npm-alias installs, CJS/deep/ESM/browser conditions, CSP, npm ls, and audit passed.')
