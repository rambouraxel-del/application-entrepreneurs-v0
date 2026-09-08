import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Les tests d'isolation et de numérotation partagent une base réelle :
    // exécution en série pour que les jeux de données ne se marchent pas dessus.
    fileParallelism: false,
    testTimeout: 30_000,
    setupFiles: ['tests/setup.ts'],
  },
});
