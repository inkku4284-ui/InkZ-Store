# Dependency security review

Reviewed against the npm audit response on 2026-10-22. Audit results describe
known advisories, not proof that the storefront is secure.

## Patched development dependency

Drizzle Kit 0.31.11 still brings in the deprecated `@esbuild-kit/esm-loader`
and `@esbuild-kit/core-utils`, whose default esbuild dependency is 0.18.20.
The scoped npm override pins **only that core-utils dependency** to esbuild
0.25.12. Drizzle Kit's own esbuild and the application's tsx remain unchanged.

[GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)
affects esbuild through 0.24.2 and is fixed starting in 0.25.0. It concerns
esbuild's development server. Keep migration tooling private; never expose its
development server or Drizzle Studio to the public Internet.

The override crosses the legacy dependency's declared version range. Verify a
clean `npm ci`, `npm run db:generate`, server tests, lint, type checking, and the
production build before accepting it. Remove the override when an upstream
Drizzle release removes or updates the legacy dependency.

## Remaining upstream advisory

The installed Next.js ESLint configuration brings in
`@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces` 3.0.3.
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
reports stack exhaustion on deeply nested brace patterns. The advisory lists
**no patched release** as of this review. npm counts this single dependency
chain as five high-severity findings; these have not been fixed by the esbuild
override.

This chain is development tooling, not a production dependency of this store.
Lint patterns and Next.js ESLint settings must remain repository-controlled.
Do not introduce customer-supplied glob patterns into lint or build tooling.
Development-only scope limits exposure; it does not patch braces or establish
that every build-time use is safe.

Do not run `npm audit fix --force` blindly. Its proposed Next.js ESLint downgrade
to 14.2.35 would mismatch this Next.js 16 project, and it previously proposed a
Drizzle Kit downgrade as well. Retain Next.js lint rules while tracking an
upstream fix rather than deleting the rules to make the audit count disappear.

## Recheck

On Windows PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`:

```powershell
npm.cmd ci
npm.cmd audit
npm.cmd audit --omit=dev
npm.cmd ls braces esbuild --all
```

After the scoped override, the observed full audit is **5 high, 0 moderate**;
the production-dependency audit is **0 findings**. Registry errors or timeouts
are inconclusive and must not be reported as a clean audit. Reassess after
upstream updates, dependency changes, or a new advisory.

Dependency checks do not replace the Stripe test-mode Preview verification in
[COMMERCE_LEDGER.md](COMMERCE_LEDGER.md). PR 1 remains a shadow ledger: reusable
Session-ID download links and entitlement enforcement are separate PR 2 work.
