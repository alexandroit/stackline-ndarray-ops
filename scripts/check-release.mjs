import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const metadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
assert.equal(metadata.name, '@stackline/ndarray-ops')
assert.equal(metadata.version, '1.0.1')
assert.equal(metadata.license, 'MIT')
assert.equal(metadata.repository.url, 'git+https://github.com/alexandroit/stackline-ndarray-ops.git')
assert.equal(metadata.homepage, 'https://alexandro.net/docs/vanilla/ndarray-ops/')
assert.equal(metadata.publishConfig.access, 'public')
assert.equal(metadata.engines.node, '>=18.0.0')
assert.deepEqual(metadata.dependencies, {})

for (const filename of ['CHANGELOG.md', 'COMPATIBILITY_CONTRACT.md', 'LICENSE', 'MIGRATION.md', 'NOTICE', 'README.md', 'SECURITY.md', 'THIRD_PARTY_LICENSES.md']) {
  assert.equal(metadata.files.includes(filename), true, `${filename} is packed`)
}
for (const filename of ['ndarray-ops.js', 'browser.js', 'index.mjs', 'index.d.ts', 'index.d.cts', 'index.d.mts', 'index.named.d.ts']) {
  assert.equal(metadata.files.includes(filename), true, `${filename} is packed`)
}
console.log('Release identity, URLs, compatibility docs, entries, and metadata passed.')
