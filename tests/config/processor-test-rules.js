/**
 * Flat ESLint config for processor tests (ESLint 9).
 * tests/config/package.json is "type": "module", so this file must be ESM.
 */
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import globals from "globals";

export default [
  {
    files: ["src/processors/**/*.test.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-require-imports": "error",
      "no-console": "warn",
      "no-debugger": "off",
      "no-case-declarations": "off",
      "no-useless-escape": "off",
      "no-inner-declarations": "off",
      "no-useless-catch": "off",
      "prefer-const": "warn",
      "no-var": "error",
    },
  },
  {
    ignores: ["dist/", "node_modules/", "coverage/"],
  },
];
