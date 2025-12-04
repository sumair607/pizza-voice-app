#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const keysPath = path.resolve(__dirname, '..', '.shop_keys.json');
const outPath = path.resolve(__dirname, '..', 'shop_keys_export.txt');

if (!fs.existsSync(keysPath)) {
  console.error('No .shop_keys.json found in project root. Create it first or contact the developer.');
  process.exit(1);
}

try {
  const raw = fs.readFileSync(keysPath, 'utf8');
  const obj = JSON.parse(raw);
  const lines = [];
  lines.push('Shop Keys Export');
  lines.push('=================');
  lines.push('');
  for (const id of Object.keys(obj).sort()) {
    lines.push(`${id}: ${obj[id]}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('Keep this file secure. Do NOT commit this file to source control.');

  fs.writeFileSync(outPath, lines.join('\n'), { encoding: 'utf8', flag: 'w' });
  console.log(`Exported ${Object.keys(obj).length} keys to ${outPath}`);
} catch (err) {
  console.error('Failed to export keys:', err.message || err);
  process.exit(1);
}
