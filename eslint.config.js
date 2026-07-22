import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

/**
 * Practical Flat Config for this Vite + React + Vitest app.
 * Focus: correctness (hooks, common mistakes). Formatting is Prettier's job.
 */
export default [
  {
    ignores: [
      'dist/**',
      'build/**',
      'coverage/**',
      'node_modules/**',
      'public/**',
    ],
  },

  js.configs.recommended,

  {
    files: ['**/*.{js,jsx}'],
    ...react.configs.flat.recommended,
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,

      // Core hooks only — skip React Compiler rule pack (too noisy for existing code).
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Project does not use PropTypes.
      'react/prop-types': 'off',

      // Allow unused `React` (legacy import with automatic JSX runtime) and `_` prefixes.
      // Removing `import React` across the tree is a mass stylistic change — not Phase 3.
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^(_|React)$',
          ignoreRestSiblings: true,
        },
      ],
    },
    plugins: {
      ...react.configs.flat.recommended.plugins,
      'react-hooks': reactHooks,
    },
  },

  // Vitest globals for test files and setup
  {
    files: [
      '**/__tests__/**/*.{js,jsx}',
      '**/*.{test,spec}.{js,jsx}',
      'src/test/**/*.{js,jsx}',
    ],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
  },

  // Node globals for tooling configs
  {
    files: ['eslint.config.js', 'vite.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Disable ESLint rules that conflict with Prettier (formatting stays with Prettier).
  prettier,
];
