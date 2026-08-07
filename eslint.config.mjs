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
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
);
