import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    // Les tests d'isolation partagent une base réelle : exécution en série
    // pour que les jeux de données ne se marchent pas dessus (même choix
    // qu'au Lot 0, voir v1-spike/vitest.config.ts).
    fileParallelism: false,
    testTimeout: 30_000,
    setupFiles: ['tests/setup.ts'],
  },
});
