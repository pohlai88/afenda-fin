// SCC-05 module-boundary control (stack/STACK.md §6-7).
//
// Phase 3A–3C: packages/{errors,time,money,contracts,db}.
// Phase 3D: apps/api (thin Hono adapter over contracts; must not be depended
// on by any package; must not import package src/* internals or packages/db).
//
// `no-domain-to-adapter` remains forward-declared (no packages/domain yet).

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-domain-to-adapter',
      comment:
        'Forward-declared only (stack/STACK.md §6-8): packages/domain must stay pure, no dependency toward an adapter/framework/I-O package. Matches zero modules in the current tree.',
      severity: 'error',
      from: { path: '^packages/domain' },
      to: { path: '^(apps|packages/(db|operations))' },
    },
    {
      name: 'no-cross-package-internal-import',
      comment:
        "A package may only be consumed through its declared package.json `exports` root API, never by reaching into another package's internal src/* subpath (doctrine NN-03; AGENTS.md 'root public API only'). Same-package internal imports (a package importing its own src/*) remain allowed.",
      severity: 'error',
      from: { path: '^packages/([^/]+)/' },
      to: {
        path: '^packages/([^/]+)/src/',
        pathNot: '^packages/$1/src/',
      },
    },
    {
      name: 'no-app-package-internal-import',
      comment:
        'Phase 3D: apps/* may only consume packages through their public exports root, never packages/*/src/* internals.',
      severity: 'error',
      from: { path: '^apps/' },
      to: { path: '^packages/[^/]+/src/' },
    },
    {
      name: 'no-package-depends-on-apps',
      comment: 'Phase 3D: packages must never depend on apps/* (adapter sits above packages).',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'no-api-depends-on-db',
      comment:
        'Phase 3D: apps/api proves HTTP architecture without inventing persistence; no packages/db dependency until a real operation needs it.',
      severity: 'error',
      from: { path: '^apps/api/' },
      to: { path: '^packages/db/' },
    },
    {
      name: 'no-money-depends-on-time',
      comment:
        'packages/money and packages/time are independent leaves over packages/errors; money must not depend on time unless an actual invariant requires it (Phase 3A brief §2 preferred dependency direction).',
      severity: 'error',
      from: { path: '^packages/money/' },
      to: { path: '^packages/time/' },
    },
    {
      name: 'no-time-depends-on-money',
      comment: 'Symmetric to no-money-depends-on-time: packages/time must not depend on packages/money.',
      severity: 'error',
      from: { path: '^packages/time/' },
      to: { path: '^packages/money/' },
    },
    {
      name: 'no-errors-depends-upward',
      comment: 'packages/errors is the dependency-graph base; it must never depend on packages/time or packages/money.',
      severity: 'error',
      from: { path: '^packages/errors/' },
      to: { path: '^packages/(time|money)/' },
    },
    {
      name: 'no-kernel-depends-on-contracts',
      comment:
        'Phase 3B: packages/contracts sits above errors/time/money (it depends on all three for its transport schemas); the dependency must never run in reverse — errors, time and money must never depend on packages/contracts.',
      severity: 'error',
      from: { path: '^packages/(errors|time|money)/' },
      to: { path: '^packages/contracts/' },
    },
    {
      name: 'no-kernel-depends-on-db',
      comment:
        'Phase 3C: packages/db sits above the kernel packages; errors/time/money must never depend on packages/db.',
      severity: 'error',
      from: { path: '^packages/(errors|time|money)/' },
      to: { path: '^packages/db/' },
    },
    {
      name: 'no-db-depends-on-contracts',
      comment:
        'Phase 3C: packages/db is a persistence boundary, not a JSON transport boundary; it must not depend on packages/contracts.',
      severity: 'error',
      from: { path: '^packages/db/' },
      to: { path: '^packages/contracts/' },
    },
    {
      name: 'no-contracts-depends-on-db',
      comment:
        'Phase 3C: packages/contracts remains a pure Zod transport layer with no database dependency.',
      severity: 'error',
      from: { path: '^packages/contracts/' },
      to: { path: '^packages/db/' },
    },
    {
      name: 'no-circular',
      comment: 'No dependency cycles anywhere in the current package graph.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    includeOnly: '^(apps|packages)',
  },
};
