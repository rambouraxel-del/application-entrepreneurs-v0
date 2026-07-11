'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const dir = __dirname;
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort();

let failed = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, [path.join(dir, file)], { stdio: 'inherit' });
  if (result.status !== 0) {
    failed += 1;
    console.error(file + ': FAILED');
  }
}

console.log('\n' + (files.length - failed) + '/' + files.length + ' fichiers de test réussis.');
process.exit(failed > 0 ? 1 : 0);
