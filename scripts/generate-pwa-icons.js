/**
 * Script para generar iconos PWA PNG desde SVG
 * Ejecutar: node scripts/generate-pwa-icons.js
 * Requiere: npm install sharp
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

// SVG base para los iconos
const createIconSVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e3a5f;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <text x="${size/2}" y="${size * 0.68}" font-family="Arial, sans-serif" font-size="${size * 0.5}" font-weight="bold" fill="white" text-anchor="middle">🍽️</text>
</svg>
`;

// Generar SVG files
const sizes = [192, 512];
sizes.forEach(size => {
  const svg = createIconSVG(size);
  writeFileSync(resolve(`public/pwa-${size}x${size}.svg`), svg);
  console.log(`Generated: public/pwa-${size}x${size}.svg`);
});

console.log('\nPara convertir a PNG, ejecuta:');
console.log('  npx @svgr/cli public/pwa-192x192.svg -o public/pwa-192x192.png');
console.log('  npx @svgr/cli public/pwa-512x512.svg -o public/pwa-512x512.png');
console.log('\nO usa una herramienta online como: https://svg2png.com/');