// Charge .env pour les tests (le spike évite une dépendance dotenv de plus).
import { readFileSync, existsSync } from 'node:fs';

const file = new URL('../.env', import.meta.url);
if (existsSync(file)) {
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
