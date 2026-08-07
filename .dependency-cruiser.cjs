// SCC-05 module-boundary control (stack/STACK.md §6-7).
//
// Phase 3A (AFENDA kernel) gives this config a real, non-empty package graph:
// packages/errors, packages/time, packages/money. Every rule below is
// justified by that actual graph — see governance/PHASE_3A_KERNEL_REPORT.md.
// Do not add rules describing packages/modules that do not exist yet; a rule
// matching zero current modules is not evidence.
//
// `no-domain-to-adapter` remains forward-declared per stack/STACK.md §8 (no
// packages/domain, apps/*, or packages/db exist yet) and is NOT counted as
// current SCC-05 evidence on its own.

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
