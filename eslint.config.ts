import eslint from "@eslint/js";
import json from "@eslint/json";
import vitest from "@vitest/eslint-plugin";
import prettier from "eslint-config-prettier";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import astro from "eslint-plugin-astro";
import { createNodeResolver, importX } from "eslint-plugin-import-x";
import pkgJson from "eslint-plugin-package-json";
import perfectionist from "eslint-plugin-perfectionist";
import unicorn from "eslint-plugin-unicorn";
import { defineConfig, includeIgnoreFile } from "eslint/config";
import globals from "globals";
import Path from "node:path";
import tseslint from "typescript-eslint";

const gitignorePath = Path.resolve(import.meta.dirname, ".gitignore");

export default defineConfig([
  includeIgnoreFile(gitignorePath),
  {
    extends: [pkgJson.configs.recommended],
    files: ["**/package.json"],
    rules: {
      // a private site, not a published package
      "package-json/require-attribution": ["error", { ignorePrivate: true }],
      "package-json/require-description": "off",
      "package-json/require-exports": ["error", { ignorePrivate: true }],
      "package-json/require-files": ["error", { ignorePrivate: true }],
      "package-json/require-license": ["error", { ignorePrivate: true }],
      "package-json/require-repository": ["error", { ignorePrivate: true }],
      "package-json/require-sideEffects": ["error", { ignorePrivate: true }],
    },
  },
  {
    extends: [json.configs.recommended],
    files: ["**/*.json"],
    ignores: ["**/package.json"],
    language: "json/json",
    rules: {
      "json/sort-keys": "error",
    },
  },
  {
    extends: [json.configs.recommended],
    files: ["**/*.jsonc", ".vscode/*.json"],
    language: "json/jsonc",
    rules: {
      "json/sort-keys": "error",
    },
  },
  {
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strict,
      tseslint.configs.stylistic,
      unicorn.configs.recommended,
      perfectionist.configs["recommended-natural"],
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],
    files: ["**/*.{js,ts,astro,mjs}"],
    rules: {
      // catches imports of packages that aren't declared in package.json
      // (they resolve only while a hoisted copy happens to be in node_modules)
      "import-x/no-extraneous-dependencies": "error",
      // plugin packages export `configs` both as a named export and on the
      // default export; `plugin.configs.x` is their documented usage
      "import-x/no-named-as-default-member": "off",
      // `astro:*` modules are virtual, provided by Astro at build time
      "import-x/no-unresolved": ["error", { ignore: ["^astro:"] }],
      // perfectionist/sort-imports owns import ordering
      "import-x/order": "off",
      "unicorn/filename-case": ["off"],
      // zod schemas and Astro's defineCollection nest calls by design
      "unicorn/max-nested-calls": ["off"],
      "unicorn/name-replacements": ["off"],
      // Astro frontmatter is a request handler, not a module body, and the
      // chart module registers ECharts components at import
      "unicorn/no-top-level-side-effects": ["off"],
      // `.catch(() => fallback)` reads better than try/catch for optional reads
      "unicorn/prefer-await": ["off"],
      // the suggested `Math.trunc(Number(x))` changes edge cases ("" -> 0,
      // "1e3" -> 1000); `Number.parseInt(x, 10)` is deliberate
      "unicorn/prefer-number-coercion": ["off"],
      // `import.meta.env.DEV && ...` keeps the build-time constant first so
      // Vite can drop the block from production builds
      "unicorn/prefer-simple-condition-first": ["off"],
    },
    settings: {
      "import-x/resolver-next": [
        createTypeScriptImportResolver(),
        createNodeResolver(),
      ],
    },
  },
  {
    files: ["*.{js,ts,mjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    extends: [astro.configs.recommended, astro.configs["jsx-a11y-strict"]],
    files: ["**/*.astro"],
    rules: {
      // https://github.com/sindresorhus/eslint-plugin-unicorn/blob/v56.0.1/docs/rules/prefer-module.md
      // accounts for Astro frontmatter not looking like an ES Module
      "unicorn/prefer-module": ["off"],
    },
  },
  {
    // client-side chart modules, loaded by the <script> in each chart's .astro wrapper
    files: ["src/components/charts/*.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    // auto-generated, no sense in linting
    ignores: ["scratchpad.js", "plan/baseline/runs/"],
  },
  {
    // baseline capture scripts: node, plus browser globals inside page.evaluate callbacks
    files: ["plan/baseline/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    extends: [vitest.configs.recommended],
    files: ["system.test.ts"],
  },
  prettier,
]);
