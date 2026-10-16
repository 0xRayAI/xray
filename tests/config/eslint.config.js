import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  js.configs.recommended,
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/ban-types': 'off',
      'no-console': 'off',
      'no-debugger': 'off',
      'no-case-declarations': 'off',
      'no-useless-escape': 'off',
      'no-inner-declarations': 'off',
      'no-useless-catch': 'off',
      'prefer-const': 'off',
      'no-var': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      'no-empty': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'src/__tests__/**'],
  },
];
