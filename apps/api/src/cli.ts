#!/usr/bin/env node
// Explicit CLI entry — listening is never a module-import side effect.

import { isMainModule } from './lib/is-main.ts';
import { createApi } from './create-api.ts';
import { startServer } from './start-server.ts';

function main(): void {
  const portRaw = process.env['PORT'] ?? '8787';
  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port <= 0) {
    console.error(`Invalid PORT: ${portRaw}`);
    process.exit(1);
  }
  const app = createApi();
  startServer(app, { port });
  console.log(`AFENDA API listening on http://127.0.0.1:${String(port)}`);
}

if (isMainModule(import.meta.url, 'cli.ts')) {
  main();
}
