import { config } from './config.js';
import { createStore } from './db/index.js';
import { createApp } from './app.js';
import { createMailer } from './mailer.js';

/**
 * Boot sequence with explicit, loud diagnostics. Every subsystem is verified
 * before the server accepts traffic, and the result is printed clearly to the
 * runtime log so a misconfiguration is visible in one glance instead of failing
 * silently in the background.
 */

const line = '='.repeat(58);
console.log(`\n${line}\n  SKELION PLATFORM - boot diagnostics\n${line}`);

// 1. Database
let store;
try {
  store = await createStore(config, console);
  await store.ping();
  console.log(`  [db]    OK        driver=${store.driver} connected`);
} catch (err) {
  console.error(`  [db]    FAILED    ${err.message}`);
  console.error('  The database is not reachable. In production the platform');
  console.error('  cannot run without it. Check DATABASE_URL and, for Supabase,');
  console.error('  that PGSSL settings are correct, then redeploy.');
  process.exit(1);
}

// 2. Schema + admin seed
try {
  await store.seedAdmin(config.adminEmail, config.adminPassword);
  if (config.adminEmail) console.log(`  [admin] OK        account ensured for ${config.adminEmail}`);
  else console.log('  [admin] SKIPPED   no ADMIN_EMAIL set (existing accounts unaffected)');
} catch (err) {
  console.error(`  [admin] WARNING   seed failed: ${err.message}`);
}

// 3. Email
const mailer = createMailer(config, console);
try {
  const v = await mailer.verify();
  if (v.ok) console.log(`  [mail]  OK        ${v.host}:${v.port} secure=${v.secure} -> ${v.to}`);
  else console.log(`  [mail]  DISABLED  ${v.error}`);
} catch (err) {
  console.log(`  [mail]  ERROR     ${err.message}`);
}

console.log(line + '\n');

// 4. Serve
const app = createApp(store, config, console, mailer);
const server = app.listen(config.port, () => {
  console.log(`[skelion] listening on :${config.port} (${config.isProd ? 'production' : 'development'}) driver=${store.driver}\n`);
});

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    server.close(async () => { await store.close(); process.exit(0); });
  });
}
