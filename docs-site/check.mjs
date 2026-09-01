import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceSiteDir = path.dirname(fileURLToPath(import.meta.url))
const siteDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(sourceSiteDir, 'dist')
const projectDir = path.resolve(sourceSiteDir, '..')
const siteFiles = [
  'index.html',
  'styles.css',
  'app.js',
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
  'llms-full.txt',
  'package-meta.json'
]
const rootFiles = [
  'README.md',
  'CHANGELOG.md',
  'COMPATIBILITY_CONTRACT.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'MIGRATION.md',
  'NOTICE',
  'PUBLISHING.md',
  'SECURITY.md',
  'THIRD_PARTY_LICENSES.md',
  'VERIFICATION.md'
]
const canonical = 'https://alexandro.net/docs/vanilla/ndarray-ops/'
const packageName = '@stackline/ndarray-ops'

function read(base, name) {
  const file = path.join(base, name)
  assert(existsSync(file), `missing documentation file: ${file}`)
  const value = readFileSync(file, 'utf8')
  assert(value.trim(), `empty documentation file: ${file}`)
  return value
}

function includesAll(value, needles, label) {
  for (const needle of needles) assert(value.includes(needle), `${label} is missing: ${needle}`)
}

const site = Object.fromEntries(siteFiles.map((name) => [name, read(siteDir, name)]))
const docs = Object.fromEntries(rootFiles.map((name) => [name, read(projectDir, name)]))
for (const name of rootFiles) assert.equal(read(siteDir, name), docs[name], `prepared documentation is stale: ${name}`)

const html = site['index.html']
const css = site['styles.css']
const app = site['app.js']
const metadata = JSON.parse(site['package-meta.json'])
const packageJson = JSON.parse(read(projectDir, 'package.json'))

assert.equal(metadata.name, packageName)
assert.equal(metadata.version, '1.0.0')
assert.equal(metadata.operations, 150)
assert.equal(metadata.productionDependencies, 0)
assert.equal(metadata.strictCsp, true)
assert.equal(packageJson.name, packageName)
assert.equal(packageJson.version, '1.0.0')
assert.equal(packageJson.homepage, canonical)
assert.deepEqual(packageJson.dependencies, {})

includesAll(html, [
  '<html lang="en">',
  '<title>@stackline/ndarray-ops | Alexandro.Net</title>',
  `<link rel="canonical" href="${canonical}">`,
  'Alexandro.Net',
  'href="#content"',
  '<main id="content" tabindex="-1">',
  '<h1 id="page-title">@stackline/<span>ndarray-ops</span></h1>',
  'npm install @stackline/ndarray-ops@1.0.0',
  'ndarray-ops": "npm:@stackline/ndarray-ops@1.0.0"',
  'Node.js ≥18',
  'CJS · ESM · browser',
  '150 operations',
  '64-cell reverse blocking',
  'not affiliated with or endorsed by',
  '<footer class="site-footer">',
  'aria-live="polite"',
  '<caption>'
], 'index.html')
assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, 'package page must contain exactly one h1')
assert(!html.includes('http://'), 'package page contains an insecure URL')
assert(!html.includes('localhost'), 'package page contains localhost')

const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
assert(jsonLdMatch, 'package page is missing JSON-LD')
const jsonLd = JSON.parse(jsonLdMatch[1])
assert.equal(jsonLd['@type'], 'SoftwareSourceCode')
assert.equal(jsonLd.name, packageName)
assert.equal(jsonLd.version, '1.0.0')
assert.equal(jsonLd.url, canonical)
assert.equal(jsonLd.runtimePlatform, 'Node.js >=18; modern browsers')

includesAll(css, [
  ':focus-visible',
  'overflow-wrap: anywhere',
  'max-width: 100%',
  'min-width: 0',
  '@media (max-width:',
  '@media (prefers-reduced-motion: reduce)',
  '@media print'
], 'styles.css')
includesAll(app, ["'use strict'", '[data-copy-target]', 'navigator.clipboard.writeText'], 'app.js')
assert(site['robots.txt'].includes('Allow: /docs/vanilla/ndarray-ops/'))
assert(site['robots.txt'].includes(`Sitemap: ${canonical}sitemap.xml`))

const locations = [...site['sitemap.xml'].matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
assert.equal(locations.length, 15)
assert.equal(new Set(locations).size, locations.length)
for (const location of locations) {
  const parsed = new URL(location)
  assert.equal(parsed.protocol, 'https:')
  assert.equal(parsed.hostname, 'alexandro.net')
  assert(parsed.pathname.startsWith('/docs/vanilla/ndarray-ops/'))
}

for (const value of [site['llms.txt'], site['llms-full.txt']]) {
  includesAll(value, [
    '@stackline/ndarray-ops@1.0.0',
    'ndarray-ops@1.2.2',
    'ndarray-ops@npm:@stackline/ndarray-ops@1.0.0',
    'Node.js 18',
    canonical,
    '150',
    'zero'
  ], 'machine-readable package reference')
}

const localLinkPattern = /(?:href|src)="([^"#][^"]*)"/g
for (const match of html.matchAll(localLinkPattern)) {
  const target = match[1]
  if (/^(?:https:|mailto:)/.test(target)) continue
  const cleanTarget = target.split('#')[0]
  if (!cleanTarget) continue
  assert(existsSync(path.join(siteDir, cleanTarget)), `broken prepared-site link: ${target}`)
}

for (const [name, value] of [...Object.entries(site), ...Object.entries(docs)]) {
  assert(!/PLACEHOLDER|\bTBD\b/.test(value), `${name} contains unfinished placeholder text`)
}

console.log(`ndarray-ops documentation checks passed: ${siteFiles.length + rootFiles.length} files`)
