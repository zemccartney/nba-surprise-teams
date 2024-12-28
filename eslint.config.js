import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginAstro from "eslint-plugin-astro";
import eslintPluginUnicorn from "eslint-plugin-unicorn";

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
  eslintConfigPrettier,
];
