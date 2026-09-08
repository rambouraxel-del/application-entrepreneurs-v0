// Prépare la base du spike : rôles → schéma Prisma → policies RLS.
// Idempotent : réexécutable à volonté (la base est recréée).
import { execFileSync } from 'node:child_process';

const PSQL = process.env.PSQL_BIN ?? 'psql';
const SUPER = process.env.SUPERUSER_URL ?? 'postgresql://postgres@127.0.0.1:55432/postgres';
const OWNER = process.env.DATABASE_URL_OWNER ?? 'postgresql://spike_owner:spike@127.0.0.1:55432/cockpit_spike';

const run = (cmd, args, env) =>
  execFileSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });

console.log('1/3 rôles et base…');
run(PSQL, [SUPER, '-v', 'ON_ERROR_STOP=1', '-q', '-f', 'scripts/bootstrap.sql']);

console.log('2/3 schéma Prisma (rôle propriétaire)…');
run('npx', ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'], { DATABASE_URL_OWNER: OWNER });

console.log('3/3 policies RLS (rôle propriétaire)…');
run(PSQL, [OWNER, '-v', 'ON_ERROR_STOP=1', '-q', '-f', 'prisma/rls.sql']);

console.log('Base du spike prête.');
