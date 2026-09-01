import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const license = await readFile(new URL('../LICENSE', import.meta.url), 'utf8')
const notice = await readFile(new URL('../NOTICE', import.meta.url), 'utf8')
const thirdParty = await readFile(new URL('../THIRD_PARTY_LICENSES.md', import.meta.url), 'utf8')
const definitelyTyped = await readFile(new URL('../licenses/DefinitelyTyped-ndarray-ops-MIT.txt', import.meta.url), 'utf8')

assert.match(license, /Copyright \(c\) 2013 Mikola Lysenko/)
assert.match(license, /Permission is hereby granted, free of charge/)
assert.match(notice, /not affiliated with or endorsed/i)
assert.match(thirdParty, /zero runtime, optional, peer, and bundled\s+dependencies/i)
assert.match(thirdParty, /ndarray-ops@1\.2\.2/)
assert.match(thirdParty, /DefinitelyTyped/)
assert.match(definitelyTyped, /MIT License/)
console.log('Upstream runtime and DefinitelyTyped MIT attribution passed.')
