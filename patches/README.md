# Temporary dependency patches

## astro@7.4.0

Backports the runtime JavaScript changes from
[Astro PR #18399](https://github.com/withastro/astro/pull/18399), addressing
[issue #18387](https://github.com/withastro/astro/issues/18387).

Since Astro 7.3.6, dev CSS traversal can refresh a server-island manifest before
the module runner sees its invalidation. The runner then keeps an old island map:
the first visited island page works, but visiting a different one can return 500
(`Could not find server component name`). This also reproduces with the Node
adapter upstream; it is separate from the NBA CDN/workerd 403.

The patch exports the resolved manifest ID and skips that CSS-free module during
dev CSS dependency traversal. It does not revert the non-cascading invalidation
fix or alter production rendering. No experimental package URL is installed.
Only the two runtime JS files are patched; pnpm's generated unrelated README
deletion entries were removed before applying the patch.

**Verification:** unpatched cold starts failed in both Home/Showdown request
orders (the second page returned 500); patched cold starts return 200 for both.
A Vite warmup workaround was tried and removed because the reverse order still
failed. Run `mise x -- pnpm run test:dev-islands` with dev/build stopped and the
2026 candidate data restored. This exercises actual page rendering, without
executing NBA fetches. Browser island loading is a separate smoke check.

**Removal:** once an Astro release includes #18399, upgrade the exact Astro pin,
remove `patchedDependencies` and this patch, reinstall, and rerun
`test:dev-islands`, the full test suite, and production/preview builds.
