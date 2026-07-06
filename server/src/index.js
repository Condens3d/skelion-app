import { config } from './config.js';
import { createStore } from './db/index.js';
import { createApp } from './app.js';
import { createMailer } from './mailer.js';

/**
 * Resilient boot sequence.
 *
 * The server ALWAYS binds its port and starts serving, even if the database or
 * SMTP are misconfigured. A subsystem failure is reported through the boot log
 * and the /api/ops/diagnostics endpoint, never by crashing the process. This is
 * the correct production posture: a live server that can tell you what is wrong
 * beats a dead process that returns an opaque 503 with no way to diagnose it.
 *
 * The one hard requirement enforced earlier (in config.js) is SESSION_SECRET in
 * production, since sessions cannot be signed safely without it.
 */

const line = '='.repeat(58);
console.log(`\n${line}\n  SKELION PLATFORM - boot diagnostics\n${line}`);

// 1. Database: attempt connection, but DO NOT exit on failure.
let store = null;
let dbError = null;
try {
  store = await createStore(config, console);
  await store.ping();
  console.log(`  [db]    OK        driver=${store.driver} connected`);
} catch (err) {
  dbError = err.message;
  console.error(`  [db]    FAILED    ${err.message}`);
  console.error('  Server will still start so diagnostics are reachable.');
  console.error('  Fix DATABASE_URL (Supabase Session pooler, port 5432). If the');
  console.error('  error mentions certificate or SSL, add PGSSL_NO_VERIFY=1 and redeploy.');
}

// 2. Schema + admin seed (only if the database connected).
if (store) {
  try {
    await store.seedAdmin(config.adminEmail, config.adminPassword);
    if (config.adminEmail) console.log(`  [admin] OK        account ensured for ${config.adminEmail}`);
    else console.log('  [admin] SKIPPED   no ADMIN_EMAIL set');
  } catch (err) {
    console.error(`  [admin] WARNING   seed failed: ${err.message}`);
  }
}

// 3. Email (never fatal).
const mailer = createMailer(config, console);
try {
  const v = await mailer.verify();
  if (v.ok) console.log(`  [mail]  OK        ${v.host}:${v.port} secure=${v.secure} -> ${v.to}`);
  else console.log(`  [mail]  DISABLED  ${v.error}`);
} catch (err) {
  console.log(`  [mail]  ERROR     ${err.message}`);
}

console.log(line);
console.log(`  Binding PORT=${config.port} HOST=0.0.0.0`);
console.log(line + '\n');

// 4. Serve. Bind explicitly to 0.0.0.0 so the platform proxy can reach us.
//    If the DB failed, mount a minimal app that still answers health + diagnostics.
const app = createApp(store, config, console, mailer, { dbError });
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`[skelion] listening on 0.0.0.0:${config.port} (${config.isProd ? 'production' : 'development'}) db=${store ? store.driver : 'DOWN'}\n`);
});

server.on('error', (err) => {
  console.error(`[skelion] FATAL: could not bind port ${config.port}: ${err.message}`);
  process.exit(1);
});

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    server.close(async () => { if (store) await store.close(); process.exit(0); });
  });
}
