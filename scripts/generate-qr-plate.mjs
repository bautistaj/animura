#!/usr/bin/env node
/**
 * Genera una placa SVG imprimible con código QR para una obra.
 * Requiere: npm install qrcode
 * Uso:      node scripts/generate-qr-plate.mjs <slug>
 * Salida:   assets/artworks/<slug>/qr-plate.svg
 */

import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const require = createRequire(import.meta.url);
const __dir   = dirname(fileURLToPath(import.meta.url));
const root    = join(__dir, '..');

const slug = process.argv[2];
if (!slug) {
  console.error('Uso: node scripts/generate-qr-plate.mjs <slug>');
  process.exit(1);
}

const { artworks } = JSON.parse(readFileSync(join(root, 'artworks.json'), 'utf8'));
const artwork = artworks.find(a => a.slug === slug);
if (!artwork) {
  console.error(`Obra no encontrada: "${slug}"`);
  console.error('Slugs disponibles:', artworks.map(a => a.slug).join(', '));
  process.exit(1);
}

let QRCode;
try {
  QRCode = require('qrcode');
} catch {
  console.error('Falta el paquete qrcode. Ejecuta: npm install qrcode');
  process.exit(1);
}

const url     = `https://bautistaj.dev/ar/${slug}/`;
const title   = artwork.title.toUpperCase();
const accent  = artwork.accent || '#178F82';
const year    = artwork.year   || '';

// Generar QR como data URL para embeber en SVG
const qrDataUrl = await QRCode.toDataURL(url, {
  width:         220,
  margin:        1,
  color: { dark: '#151515', light: '#F5F1E8' }
});

const plate = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="400" height="520" viewBox="0 0 400 520">
  <rect width="400" height="520" fill="#F5F1E8"/>
  <rect x="0" y="0" width="400" height="88" fill="#3A2925"/>
  <text x="200" y="28" text-anchor="middle" fill="#F5F1E8"
        font-family="Arial Black, sans-serif" font-size="11" letter-spacing="4" font-weight="900">BTAJ MX</text>
  <text x="200" y="66" text-anchor="middle" fill="#F5F1E8"
        font-family="Arial Black, sans-serif" font-size="${title.length > 14 ? 18 : 24}" font-weight="900" letter-spacing="1">${title}</text>
  <image xlink:href="${qrDataUrl}" x="90" y="100" width="220" height="220"/>
  <text x="200" y="348" text-anchor="middle" fill="#3A2925"
        font-family="Arial, sans-serif" font-size="11" letter-spacing="2.5">ESCANEA PARA VER LA ANIMACIÓN AR</text>
  <text x="200" y="372" text-anchor="middle" fill="#3A2925"
        font-family="Arial, sans-serif" font-size="10" opacity="0.5">${url}</text>
  <line x1="40" y1="410" x2="360" y2="410" stroke="#3A2925" stroke-width="1" opacity="0.15"/>
  <text x="200" y="432" text-anchor="middle" fill="#3A2925"
        font-family="Arial, sans-serif" font-size="10" opacity="0.38">${year}</text>
  <rect x="0" y="500" width="400" height="20" fill="${accent}"/>
</svg>`;

const outPath = join(root, 'assets', 'artworks', slug, 'qr-plate.svg');
writeFileSync(outPath, plate);
console.log(`✓ QR plate guardado: assets/artworks/${slug}/qr-plate.svg`);
console.log(`  URL:  ${url}`);
console.log(`  Para imprimir: abre el SVG en el navegador o Inkscape.`);
