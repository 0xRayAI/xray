import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        global: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        performance: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "no-console": "off",
      "no-debugger": "off",
      "prefer-const": "off",
      "no-var": "off",
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-case-declarations": "off",
      "no-useless-escape": "off",
    },
  },
  {
    ignores: [
      "dist/",
      "node_modules/",
      "**/*.js",
      "**/*.d.ts",
      "src/__tests__/**",
    ],
  },
];
