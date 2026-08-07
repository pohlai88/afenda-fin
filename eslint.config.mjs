// Type-aware lint for the AFENDA governance tooling surface (SCC-01, SCC-02)
// AND, since Phase 3A, every packages/*/src and packages/*/tests file. Uses
// typescript-eslint's `projectService` (rather than a fixed `project` array)
// so each linted file is checked against whichever tsconfig.json actually
// owns it (root tsconfig.json for scripts/**, each package's own
// tsconfig.json for packages/*/**) without this file needing to enumerate
// every package by hand as packages are added. Plain-JS config files (this
// file, .dependency-cruiser.cjs) are not part of any TypeScript program and
// are excluded from type-aware parsing.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['node_modules/**', '**/node_modules/**', 'governance/history/**', 'eslint.config.mjs', '.dependency-cruiser.cjs'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      // Phase 3B.1 (governance/PHASE_3B1_LINT_REPORT.md): no-unsafe-member-access and
      // no-unsafe-call remain OFF deliberately — no current violation makes them
      // mechanically necessary yet, and the phase brief scopes this change to the two
      // unsafe-ingress rules with concrete red evidence (assignment, argument).
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
);
