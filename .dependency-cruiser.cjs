// Scaffold only (SCC-05, stack/STACK.md §6-7 module-boundary constraints).
// No packages exist yet in this tree; these rules currently match zero modules.
// Do not treat a clean `depcruise` run over an empty tree as implemented evidence —
// see governance/control-implementation.json SCC-05 for the honest state.

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-domain-to-adapter',
      comment:
        'packages/domain must stay pure: no dependency toward an adapter, framework, or I/O package (doctrine NN-03; stack/STACK.md §6-7).',
      severity: 'error',
      from: { path: '^packages/domain' },
      to: { path: '^(apps|packages/(db|operations))' },
    },
    {
      name: 'no-internal-subpath-imports',
      comment: "Never import from another package's internal subpath (doctrine NN-03).",
      severity: 'error',
      from: {},
      to: { path: 'packages/[^/]+/src/internal' },
    },
    {
      name: 'no-circular',
      comment: 'No dependency cycles.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    includeOnly: '^(apps|packages)',
  },
};
