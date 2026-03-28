// generate-icons.js — Genererar SVG-ikoner för PWA
// Skapar enkla SVG-filer med Sunkis-loggan
// Kör med: node scripts/generate-icons.js

const fs = require('fs')
const path = require('path')

// SVG-ikon med Sunkis-logga (ölglas + text)
function createSvgIcon(size) {
  const fontSize = Math.floor(size * 0.28)
  const subFontSize = Math.floor(size * 0.14)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Bakgrund -->
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#1a1a18"/>

  <!-- Ölglas-siluett -->
  <g transform="translate(${size/2}, ${size * 0.35})">
    <!-- Glaset -->
    <path d="M-${size*0.18} -${size*0.2} L-${size*0.14} ${size*0.15} L${size*0.14} ${size*0.15} L${size*0.18} -${size*0.2} Z"
      fill="none" stroke="#EF9F27" stroke-width="${size*0.025}" stroke-linejoin="round"/>
    <!-- Skummet -->
    <ellipse cx="0" cy="-${size*0.2}" rx="${size*0.18}" ry="${size*0.05}" fill="#EF9F27" opacity="0.8"/>
    <!-- Handtaget -->
    <path d="M${size*0.14} -${size*0.05} Q${size*0.28} -${size*0.05} ${size*0.28} ${size*0.05} Q${size*0.28} ${size*0.12} ${size*0.14} ${size*0.12}"
      fill="none" stroke="#EF9F27" stroke-width="${size*0.025}"/>
  </g>

  <!-- Text: sunk -->
  <text x="${size/2}" y="${size*0.78}"
    font-family="Inter, Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="500"
    fill="#EF9F27"
    text-anchor="middle"
    dominant-baseline="middle">sunk</text>

  <!-- Text: is (ljusare) -->
  <text x="${size/2 + fontSize * 1.15}" y="${size*0.78}"
    font-family="Inter, Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="500"
    fill="#F5C55B"
    text-anchor="middle"
    dominant-baseline="middle">is</text>
</svg>`
}

// Spara SVG-filer som placeholder-ikoner
// (I produktion: ersätt med riktiga PNG-ikoner)
const iconsDir = path.join(__dirname, '..', 'public', 'icons')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), createSvgIcon(192))
fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), createSvgIcon(512))

console.log('✅ SVG-ikoner skapade i public/icons/')
console.log('   Tips: Konvertera till PNG med: npx sharp-cli eller liknande verktyg.')
console.log('   Eller ersätt med riktiga PNG-filer manuellt.')
