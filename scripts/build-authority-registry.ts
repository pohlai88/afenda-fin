#!/usr/bin/env node
// GENERATED-FILE WRITER — this script is source; its JSON *outputs* under
// governance/ are generated projections. Re-running against unchanged
// doctrine/DOCTRINE.md, stack/STACK.md and position/POSITION.md must produce
// byte-identical output (verified by scripts/check-authority-integrity.ts).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildRegistries, toJsonBytes } from './lib/authority-parser.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PATHS = {
  doctrine: path.join(ROOT, 'doctrine', 'DOCTRINE.md'),
  stack: path.join(ROOT, 'stack', 'STACK.md'),
  position: path.join(ROOT, 'position', 'POSITION.md'),
  outAuthorityIndex: path.join(ROOT, 'governance', 'authority-index.json'),
  outDoctrine: path.join(ROOT, 'governance', 'doctrine-registry.json'),
  outStack: path.join(ROOT, 'governance', 'stack-registry.json'),
  outPosition: path.join(ROOT, 'governance', 'position-registry.json'),
};

function main(): void {
  const doctrineText = readFileSync(PATHS.doctrine, 'utf8');
  const stackText = readFileSync(PATHS.stack, 'utf8');
  const positionText = readFileSync(PATHS.position, 'utf8');

  const { doctrineRegistry, stackRegistry, positionRegistry, authorityIndex } = buildRegistries({
    doctrineText,
    stackText,
    positionText,
  });

  writeFileSync(PATHS.outDoctrine, toJsonBytes(doctrineRegistry), 'utf8');
  writeFileSync(PATHS.outStack, toJsonBytes(stackRegistry), 'utf8');
  writeFileSync(PATHS.outPosition, toJsonBytes(positionRegistry), 'utf8');
  writeFileSync(PATHS.outAuthorityIndex, toJsonBytes(authorityIndex), 'utf8');

  console.log('Generated governance registries:');
  console.log(
    `  doctrine-registry.json  : ${doctrineRegistry.rules.length} rules, ${doctrineRegistry.verification_controls.length} V-controls, ${doctrineRegistry.forbidden.length} forbidden items`,
  );
  console.log(
    `  stack-registry.json     : ${stackRegistry.selections.length} selections, ${stackRegistry.controls.length} controls, ${stackRegistry.explicit_rejections.length} rejections, ${stackRegistry.escape_hatches.length} escape hatches`,
  );
  console.log(
    `  position-registry.json  : ${positionRegistry.obligations.length} obligations, ${positionRegistry.compatibility_result_classes.length} result classes`,
  );
  console.log('  authority-index.json    : 3 documents indexed');
}

main();
