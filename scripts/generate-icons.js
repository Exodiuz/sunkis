// generate-icons.js — Genererar app-ikoner för PWA, favicon och iOS
// Kör med: node scripts/generate-icons.js
//
// Skriver SVG-källor och renderar PNG med Chromes headless-läge (inga
// npm-beroenden). Ange CHROME_PATH om Chrome inte ligger på standardplatsen.
//
// Färgerna speglar varumärket i lib/theme.ts (V1) — ändra där först.

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const COLORS = {
  ink: '#1A1A18',   // colors.ink
  brand: '#FF3D8B', // colors.brand.DEFAULT
  teal: '#1FB8A6',  // colors.teal
}

// Ölsejdel på 512-rutnät. Efter centreringen ligger allt inom en cirkel med
// radie 205 runt mitten, så att det klarar Androids säkra zon för maskable-ikoner (80 %).
const ARTWORK = `
  <!-- Handtag -->
  <path d="M304 236 H354 Q372 236 372 254 V302 Q372 320 354 320 H300"
    fill="none" stroke="${COLORS.brand}" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Glaset -->
  <path d="M160 196 H312 L300 368 Q299 384 283 384 H189 Q173 384 172 368 Z" fill="${COLORS.brand}"/>
  <!-- Bubblor -->
  <circle cx="214" cy="300" r="11" fill="${COLORS.ink}" opacity="0.35"/>
  <circle cx="254" cy="262" r="8" fill="${COLORS.ink}" opacity="0.35"/>
  <circle cx="266" cy="334" r="13" fill="${COLORS.ink}" opacity="0.35"/>
  <!-- Skum -->
  <g fill="${COLORS.teal}">
    <circle cx="182" cy="190" r="32"/>
    <circle cx="228" cy="170" r="40"/>
    <circle cx="282" cy="174" r="37"/>
    <circle cx="316" cy="196" r="26"/>
    <rect x="152" y="186" width="190" height="26" rx="13"/>
  </g>
`

// variant 'any': rundade hörn (favicon, manifest "any")
// variant 'maskable': utfallande bakgrund, plattformen maskar själv
function createSvgIcon(size, variant) {
  const radius = variant === 'any' ? 112 : 0
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${COLORS.ink}"/>
  <!-- Flyttad 12 px åt vänster så att glas + handtag hamnar i mitten -->
  <g transform="translate(-12 0)">${ARTWORK}</g>
</svg>
`
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean)
  return candidates.find(p => fs.existsSync(p)) ?? null
}

// Renderar en SVG till PNG med transparent bakgrund
function renderPng(chrome, svg, size, outPath) {
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sunkis-icon-')), 'icon.svg')
  fs.writeFileSync(tmp, svg)
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--default-background-color=00000000',
    `--window-size=${size},${size}`,
    `--screenshot=${outPath}`,
    `file://${tmp}`,
  ], { stdio: 'ignore' })
  fs.rmSync(path.dirname(tmp), { recursive: true, force: true })
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(iconsDir, { recursive: true })

// SVG-favicon
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), createSvgIcon(512, 'any'))
console.log('✅ public/icons/icon.svg')

const PNGS = [
  { file: 'icon-192.png', size: 192, variant: 'any' },
  { file: 'icon-512.png', size: 512, variant: 'any' },
  { file: 'icon-maskable-192.png', size: 192, variant: 'maskable' },
  { file: 'icon-maskable-512.png', size: 512, variant: 'maskable' },
  // iOS rundar hörnen själv och vill ha en ogenomskinlig bild
  { file: 'apple-touch-icon.png', size: 180, variant: 'maskable' },
]

const chrome = findChrome()
if (!chrome) {
  console.error('❌ Hittade inte Chrome. Ange CHROME_PATH för att rendera PNG-ikonerna.')
  process.exit(1)
}

for (const { file, size, variant } of PNGS) {
  renderPng(chrome, createSvgIcon(size, variant), size, path.join(iconsDir, file))
  console.log(`✅ public/icons/${file}`)
}

// favicon.ico med inbäddade PNG-bilder (16, 32, 48 px) — ICO kan innehålla PNG direkt
function writeIco(images, outPath) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)             // reserverat
  header.writeUInt16LE(1, 2)             // typ: ikon
  header.writeUInt16LE(images.length, 4) // antal bilder
  let offset = 6 + 16 * images.length
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size, 0)            // bredd
    entry.writeUInt8(size, 1)            // höjd
    entry.writeUInt16LE(1, 4)            // färgplan
    entry.writeUInt16LE(32, 6)           // bitar per pixel
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += data.length
    return entry
  })
  fs.writeFileSync(outPath, Buffer.concat([header, ...entries, ...images.map(i => i.data)]))
}

const icoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sunkis-ico-'))
const icoImages = [16, 32, 48].map(size => {
  const file = path.join(icoDir, `${size}.png`)
  renderPng(chrome, createSvgIcon(size, 'any'), size, file)
  return { size, data: fs.readFileSync(file) }
})
fs.rmSync(icoDir, { recursive: true, force: true })
writeIco(icoImages, path.join(__dirname, '..', 'app', 'favicon.ico'))
console.log('✅ app/favicon.ico')
