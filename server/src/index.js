import { config } from './config.js';
import { createStore } from './db/index.js';
import { createApp } from './app.js';

const store = await createStore(config, console);
await store.seedAdmin(config.adminEmail, config.adminPassword);

const app = createApp(store, config);
const server = app.listen(config.port, () => {
  console.log(`[skelion] listening on :${config.port} (${config.isProd ? 'production' : 'development'}) driver=${store.driver}`);
});

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    server.close(async () => { await store.close(); process.exit(0); });
  });
}
