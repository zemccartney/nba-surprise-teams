import Path from "node:path";
import Url from "node:url";
import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginAstro from "eslint-plugin-astro";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import eslintPluginReact from "eslint-plugin-react";
import globals from "globals";
import tseslint from "typescript-eslint";
import { includeIgnoreFile } from "@eslint/compat";

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
      "unicorn/prevent-abbreviations": ["off"],
      "unicorn/no-keyword-prefix": ["off"],
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
  eslintConfigPrettier,
);
