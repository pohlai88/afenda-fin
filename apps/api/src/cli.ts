#!/usr/bin/env node
// Explicit CLI entry — listening is never a module-import side effect.

import { isMainModule } from './lib/is-main.ts';
import { createApi } from './create-api.ts';
import { startServer } from './start-server.ts';

const DEFAULT_PORT = 8787;

function main(): void {
  const portEnv = process.env['PORT'];
  const portRaw = portEnv ?? String(DEFAULT_PORT);
  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port <= 0) {
    console.error(`Invalid PORT: ${portRaw}`);
    process.exit(1);
  }
  if (portEnv === undefined) {
    console.log(`PORT unset; defaulting to ${String(DEFAULT_PORT)}`);
  }
  const app = createApi();
  startServer(app, { port });
  console.log(`AFENDA API listening on http://127.0.0.1:${String(port)}`);
}

if (isMainModule(import.meta.url, 'cli.ts')) {
  main();
}
