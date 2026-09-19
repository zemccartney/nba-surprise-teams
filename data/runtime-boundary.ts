/* eslint unicorn/no-this-outside-of-class: "off" -- Vite supplies the actual hook context as this. */
import type { Plugin } from "vite";

/**
SSR is true for both static rendering and Workers; it is not the boundary.
*/
export function assertPrerender(environment: string, id: string): void {
  if (environment !== "prerender") {
    throw new Error(
      `[sqlite-boundary] ${id} is prerender-only; attempted access from ${environment}. ` +
        "Server islands and on-demand routes must use the metadata catalog and live data, not SQLite.",
    );
  }
}

/**
The directory is owned by Node CLI/build code, not application runtime code.
*/
export function isSqliteModule(id: string): boolean {
  const path = id.replaceAll("\\", "/").split("?", 1)[0] ?? id;
  return (
    path === "node:sqlite" ||
    path === "virtual:tracker/archive" ||
    path === "\0tracker:archive" ||
    /(?:^|\/)data\/node\//.test(path)
  );
}

/**
 * Enforce on actual module loading as well as build graphs. This catches a
 * transitive SQL import in a shared component when the island is requested in
 * dev, without relying on component filenames or the server:defer attribute.
 * Plain Node maintenance commands do not use Vite and remain allowed.
 */
export function sqliteBoundary(): Plugin {
  return {
    configEnvironment() {
      // Dependency scanning also visits static-route source. These imports
      // are application/runtime boundaries, not dependencies to prebundle.
      return {
        optimizeDeps: { exclude: ["virtual:tracker/archive", "node:sqlite"] },
      };
    },
    // Run after Astro/TypeScript transform so this.parse sees JavaScript.
    enforce: "post",
    // Build: allowed Node graphs need no scan. A forbidden edge in any other
    // environment deliberately calls assertPrerender to produce the shared error.
    generateBundle() {
      if (this.environment.name === "prerender") return;
      for (const id of this.getModuleIds()) {
        const info = this.getModuleInfo(id);
        for (const dependency of [
          id,
          ...(info?.importedIds ?? []),
          ...(info?.dynamicallyImportedIds ?? []),
        ]) {
          if (isSqliteModule(dependency))
            assertPrerender(this.environment.name, dependency);
        }
      }
    },
    // Dev/build: guard resolved Node modules, including transitive imports.
    load(id) {
      if (isSqliteModule(id)) assertPrerender(this.environment.name, id);
    },
    name: "tracker-sqlite-boundary",
    // Dev/build: fail known public imports before loading wherever resolution sees them.
    resolveId(id) {
      // Catch resolvable imports early; transform also covers builtin externalization.
      if (id === "node:sqlite" || id === "virtual:tracker/archive")
        assertPrerender(this.environment.name, id);
    },
    // Dev/build: inspect emitted JavaScript to catch imports Vite externalized early.
    transform(code, id) {
      if (this.environment.name === "prerender") return;
      if (isSqliteModule(id)) assertPrerender(this.environment.name, id);
      // Vite can externalize native builtins before resolveId/load hooks.
      // Parse only potential matches; comments and ordinary strings are not imports.
      if (!code.includes("node:sqlite")) return;
      const environment = this.environment.name;
      const visit = (node: unknown): void => {
        if (!node || typeof node !== "object") return;
        const record = node as Record<string, unknown>;
        const kind = record.type;
        if (
          [
            "ExportAllDeclaration",
            "ExportNamedDeclaration",
            "ImportDeclaration",
            "ImportExpression",
          ].includes(String(kind))
        ) {
          const source = record.source as undefined | { value?: unknown };
          if (source?.value === "node:sqlite")
            assertPrerender(environment, "node:sqlite");
        }
        if (kind === "CallExpression") {
          const callee = record.callee as
            | undefined
            | { name?: unknown; type?: unknown };
          const args = record.arguments as undefined | { value?: unknown }[];
          if (
            callee?.type === "Identifier" &&
            callee.name === "require" &&
            args?.[0]?.value === "node:sqlite"
          ) {
            assertPrerender(environment, "node:sqlite");
          }
        }
        for (const child of Object.values(record)) {
          if (Array.isArray(child)) {
            for (const item of child) visit(item);
          } else if (child && typeof child === "object") visit(child);
        }
      };
      visit(this.parse(code));
    },
  };
}
