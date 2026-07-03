/**
 * Data-layer factory. Selects a driver by DATABASE_URL:
 *   - postgres:// or postgresql://  -> PostgreSQL (production, IIS + cloud)
 *   - anything else / unset         -> SQLite via node:sqlite (local dev only)
 *
 * Both drivers expose the SAME async repository API so the rest of the
 * app is storage-agnostic. Swapping engines never touches route code.
 */
import { createPostgresStore } from './postgres.js';
import { createSqliteStore } from './sqlite.js';

export async function createStore(config, log = console) {
  const url = config.databaseUrl || '';
  if (/^postgres(ql)?:\/\//i.test(url)) {
    log.info?.('[db] driver: PostgreSQL');
    return createPostgresStore(config, log);
  }
  log.warn?.('[db] driver: SQLite (node:sqlite) — DEV/LOCAL ONLY. Set DATABASE_URL to a postgres:// DSN for production.');
  return createSqliteStore(config, log);
}
