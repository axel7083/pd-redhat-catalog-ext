# AGENTS.md

## Project Overview

Podman Desktop extension to browse, inspect and pull images from the Red Hat Ecosystem Catalog.
A SvelteKit webview talks to the extension backend over RPC; the backend calls Hydra Solr (search)
and Pyxis GraphQL (details), both internal catalog APIs used anonymously.

- **Tech stack**: TypeScript, Node.js 24, pnpm workspaces, Vite, Inversify, zod, GraphQL Code Generator, SvelteKit (static), Svelte 5, Tailwind CSS 4
- **Packages**: `packages/backend`, `packages/frontend`, `packages/shared` (`@podman-desktop/extension-redhat-catalog-core-api`)
- **Manifest and entrypoint**: `packages/backend/package.json`, `packages/backend/src/extension.ts`
- **Built output**: `packages/backend/dist/extension.cjs` and the webview in `packages/backend/media/`

## Quick Start

```sh
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm build
```

The backend and frontend consume the shared package from `packages/shared/dist`: build (at least `pnpm build:shared`) before typecheck or tests.

## Essential Commands

```sh
pnpm build           # shared, then frontend + backend
pnpm watch
pnpm typecheck       # tsc (shared, backend) + svelte-check (frontend)
pnpm lint:check
pnpm lint:fix
pnpm format:check
pnpm format:fix
pnpm test            # shared, backend, frontend unit tests
pnpm test:contract   # live contract tests against the catalog APIs (network)
pnpm pyxis:codegen   # regenerate packages/backend/src/pyxis/generated (committed)
pnpm pyxis:schema    # refresh packages/backend/pyxis/schema.graphql from the live API
```

## Single-File Verification

```sh
pnpm exec eslint path/to/file.ts
pnpm typecheck:backend
pnpm typecheck:frontend
pnpm exec vitest run --project redhat-catalog path/to/file.spec.ts
pnpm --dir packages/frontend exec vitest run path/to/file.spec.ts
```

## Skills

Task-specific guidance lives in `.agents/skills/`:

- `extension-development` - backend/frontend/shared change flow
- `svelte-ui-design` - Svelte 5 component and state guidance
- `unit-testing` - backend/frontend/shared test strategy

## Architecture

Webview (frontend) <-> shared contract <-> backend extension

- `packages/shared/src/apis`: abstract API classes with a `CHANNEL`; the frontend gets a proxy (`rpcBrowser.getProxy`), the backend registers an implementation (`main-service.ts`).
- `packages/backend/src/hydra`: Hydra query builder and zod schemas. `services/hydra-search-service.ts` caches results.
- `packages/backend/src/pyxis/queries.ts`: Pyxis GraphQL operations; `generated/` is produced by codegen and must not be edited.
- `packages/backend/src/catalog`: Pyxis → DTO mapping and pull registry resolution.
- `packages/backend/src/services/auth-service.ts`: Red Hat sign-in through the `redhat.authentication-provider` of the Red Hat Authentication extension (soft dependency).
- `packages/frontend/src/routes`: `/` explore (state in the URL), `/repository/[registry]/[...repository]` details (tab in `?tab=`, architecture in `?arch=`).

## Pattern References

- New backend API method: abstract method in `packages/shared/src/apis/*-api.ts`, implementation in `packages/backend/src/apis/*-api-impl.ts`; add it to `noTimeoutChannels` (`shared/src/messages/constants.ts`) if it can exceed 5s.
- New Pyxis field: edit `queries.ts`, run `pnpm pyxis:codegen`, map it in `catalog/repository-mapper.ts`.
- New search facet or field: `FACET_FIELDS` in `shared/src/models/search.ts`, `HYDRA_FIELDS` and the zod schema in `backend/src/hydra/`.
- Backend → frontend events: `Publisher` subclass with a `Messages` channel, consumed with `RPCReadable` or `rpcBrowser.subscribe`.
