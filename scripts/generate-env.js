#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const targetDir = path.join(rootDir, 'src/environments');
const targetFile = path.join(targetDir, 'environment.ts');

let mapboxKey = process.env.MAPBOX_API_KEY || '';
let cartoKey = process.env.CARTO_API_KEY || '';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // Remove surrounding quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key === 'MAPBOX_API_KEY') {
        mapboxKey = val;
      } else if (key === 'CARTO_API_KEY') {
        cartoKey = val;
      }
    }
  }
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function formatField(name, val) {
  const escaped = val.replace(/'/g, "\\'");
  if (escaped.length > 50) {
    return `  ${name}:\n    '${escaped}',`;
  }
  return `  ${name}: '${escaped}',`;
}

const fileContent = `export const environment = {
  production: false,
  networkTimeoutMs: 10000,
${formatField('mapboxKey', mapboxKey)}
${formatField('cartoKey', cartoKey)}
};
`;

fs.writeFileSync(targetFile, fileContent, 'utf8');
console.log(`[generate-env] Generated src/environments/environment.ts (mapboxKey: ${mapboxKey ? 'configured' : 'none'}, cartoKey: ${cartoKey ? 'configured' : 'none'})`);
