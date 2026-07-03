import { config } from './config.js';
import { openDb, seedAdmin } from './db.js';
import { createApp } from './app.js';

const db = openDb(config.dbPath);
seedAdmin(db, config.adminEmail, config.adminPassword, console);

const app = createApp(db, config);
app.listen(config.port, () => {
  console.log(`[skelion] listening on :${config.port} (${config.isProd ? 'production' : 'development'})`);
});
