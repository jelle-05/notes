/**
 * Genereert icon-192.png, icon-512.png, icon-maskable.png en
 * apple-touch-icon.png vanuit icon.svg.
 * Vereist: npm install --save-dev sharp
 *
 * Maskable: het icoon wordt op ~80% gecentreerd op een vol-vlak #FFCC00-canvas,
 * zodat de content binnen de Android safe zone valt en niets wordt afgesneden
 * in ronde/gemaskeerde icon-vormen. De afgeronde hoeken van het bron-icoon
 * vallen weg tegen dezelfde achtergrondkleur (naadloos full-bleed).
 *
 * Apple touch icon (180×180): óók full-bleed — iOS rondt zelf de hoeken af en
 * ondersteunt geen transparantie, dus de afgeronde SVG-hoeken worden met
 * dezelfde achtergrondkleur opgevuld.
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

// Apple touch icon: 180×180, icoon vol op een full-bleed canvas (iOS rondt
// zelf af en ondersteunt geen transparantie in de hoeken)
const APPLE = 180
const appleIngeschaald = await sharp(svg).resize(APPLE, APPLE).png().toBuffer()
await sharp({
  create: { width: APPLE, height: APPLE, channels: 4, background: ACHTERGROND },
})
  .composite([{ input: appleIngeschaald }])
  .png()
  .toFile(join(__dirname, '..', 'public', 'apple-touch-icon.png'))
console.log(`✓ apple-touch-icon.png (${APPLE}×${APPLE}, full-bleed ${ACHTERGROND})`)

console.log('Klaar!')
