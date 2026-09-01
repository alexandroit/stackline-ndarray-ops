import { rm } from 'node:fs/promises'

for (const path of ['../browser.js', '../coverage', '../docs-site/dist']) {
  await rm(new URL(path, import.meta.url), { force: true, recursive: true })
}
