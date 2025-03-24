import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginAstro from "eslint-plugin-astro";
import eslintPerfectionist from "eslint-plugin-perfectionist";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import globals from "globals";
import Path from "node:path";
import Url from "node:url";
import tseslint from "typescript-eslint";

const __filename = Url.fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);
const gitignorePath = Path.resolve(__dirname, ".gitignore");

export default tseslint.config(
  includeIgnoreFile(gitignorePath),
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  ...eslintPluginAstro.configs.recommended,
  ...eslintPluginAstro.configs["jsx-a11y-strict"],
  eslintPluginUnicorn.configs["flat/recommended"],
  {
    files: ["*.{js,ts,mjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    rules: {
      "unicorn/no-keyword-prefix": ["off"],
      "unicorn/prevent-abbreviations": ["off"],
    },
  },
  {
    files: ["**/*.astro"],
    rules: {
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/v56.0.1/docs/rules/prefer-module.md
      // accounts for Astro frontmatter not looking like an ES Module
      "unicorn/prefer-module": ["off"],
    },
  },
  {
    files: ["**/*.{tsx}"],
    ...eslintPluginReact.configs.flat.recommended,
  },
  {
    // auto-generated, no sense in linting
    ignores: ["worker-configuration.d.ts", "scratchpad.js"],
  },
  eslintPerfectionist.configs["recommended-natural"],
  eslintConfigPrettier,
);
