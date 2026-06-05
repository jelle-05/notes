/**
 * Genereert icon-192.png, icon-512.png en icon-maskable.png vanuit icon.svg.
 * Vereist: npm install --save-dev sharp
 *
 * Maskable: het icoon wordt op ~80% gecentreerd op een vol-vlak #FFCC00-canvas,
 * zodat de content binnen de Android safe zone valt en niets wordt afgesneden
 * in ronde/gemaskeerde icon-vormen. De afgeronde hoeken van het bron-icoon
 * vallen weg tegen dezelfde achtergrondkleur (naadloos full-bleed).
 */
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgPath = join(__dirname, '..', 'public', 'icon.svg')
const svg = readFileSync(svgPath)

const ACHTERGROND = '#FFCC00'  // zelfde geel als de rect in icon.svg
const CANVAS = 512
const SAFE = 410               // ~80% van 512: binnen de maskable safe zone

// Normale icons: 1-op-1 resize van het SVG
for (const { naam, px } of [
  { naam: 'icon-192.png', px: 192 },
  { naam: 'icon-512.png', px: 512 },
]) {
  const uitvoer = join(__dirname, '..', 'public', naam)
  await sharp(svg).resize(px, px).png().toFile(uitvoer)
  console.log(`✓ ${naam} (${px}×${px})`)
}

// Maskable: icoon op ~80% gecentreerd op vol-vlak canvas
const ingeschaald = await sharp(svg).resize(SAFE, SAFE).png().toBuffer()
const uitvoer = join(__dirname, '..', 'public', 'icon-maskable.png')
await sharp({
  create: { width: CANVAS, height: CANVAS, channels: 4, background: ACHTERGROND },
})
  .composite([{ input: ingeschaald }])  // gravity: centre (default)
  .png()
  .toFile(uitvoer)
console.log(`✓ icon-maskable.png (${CANVAS}×${CANVAS}, full-bleed ${ACHTERGROND}, content ${SAFE}px)`)

console.log('Klaar!')
