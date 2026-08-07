// @ts-check
// Type-aware lint for the AFENDA governance tooling surface (SCC-01, SCC-02).
// Scope is every scripts/**/*.ts file (see tsconfig.json). Plain-JS config
// files (this file, .dependency-cruiser.cjs) are not part of the TypeScript
// program and are excluded from type-aware parsing.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'governance/history/**', 'eslint.config.mjs', '.dependency-cruiser.cjs'],
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
