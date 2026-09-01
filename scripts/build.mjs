import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFile, readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const source = new URL('ndarray-ops.js', root)
const browser = new URL('browser.js', root)

await copyFile(source, browser)
for (const entry of [source, browser, new URL('index.mjs', root)]) {
  execFileSync(process.execPath, ['--check', entry.pathname], { stdio: 'inherit' })
}
assert.equal(await readFile(browser, 'utf8'), await readFile(source, 'utf8'))

const operations = await import(new URL('index.mjs', root))
assert.equal(Object.keys(operations.default).length, 150)
assert.equal(Object.hasOwn(operations.default, 'default'), false)
console.log('Built byte-identical CSP-safe browser entry and validated 150 ESM operations.')
