// @ts-check
// Type-aware lint for the Phase 2 governance tooling surface (SCC-01, SCC-02).
// Scope intentionally excludes the pre-existing Phase 1 authority scripts;
// see tsconfig.json and governance/CONTROL_PLANE_REPORT.md for why.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'governance/history/**',
      'scripts/build-authority-registry.mjs',
      'scripts/check-authority-integrity.mjs',
      'scripts/lib/authority-parser.mjs',
      '.dependency-cruiser.cjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        project: './tsconfig.json',
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
