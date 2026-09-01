import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

const result = spawnSync(process.execPath, ['test/runtime-compat.cjs'], {
  cwd: new URL('../', import.meta.url),
  encoding: 'utf8'
})
assert.equal(result.status, 0, result.stdout + result.stderr)
process.stdout.write(result.stdout)
