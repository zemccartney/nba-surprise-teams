import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginAstro from "eslint-plugin-astro";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import eslintPluginReact from "eslint-plugin-react";

export default [
  ...eslintPluginAstro.configs.recommended,
  ...eslintPluginAstro.configs["jsx-a11y-strict"],
  eslintPluginUnicorn.configs["flat/all"],
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
];
