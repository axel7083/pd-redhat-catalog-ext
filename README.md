# Podman Desktop Red Hat Catalog extension

## Overview

Browse, inspect and pull container images from the [Red Hat Ecosystem Catalog](https://catalog.redhat.com/software/containers/search) without leaving Podman Desktop: about 10,000 repositories from Red Hat and its certified partners, including the Red Hat Hardened Images.

- **Explore**: full-text search with scopes as tabs (All, Red Hat, Hardened images, Partners) and one filter bar (searchable multi-select architecture / image type / category, sort), pagination, and Pull / Open / Run from the cards. Without search text, the All scope lists Hardened images first, then Red Hat repositories.
- **Repository details**: overview (description, documentation, categories), **Get this image** (resolved registry, tag or digest, pull command, pull into any container engine, then open or run), tags history, **Security** (health index, CVEs with advisories), **Packages** (RPM manifest) and **Containerfile**.
- **Authenticated pulls**: images that require a Red Hat account are pulled from `registry.redhat.io`. Sign-in is delegated to the [Red Hat Authentication](https://github.com/redhat-developer/podman-desktop-redhat-account-ext) extension, which configures the registry credentials. It is a soft dependency: everything else works anonymously.

Browsing needs no account and no API key.

## How it works

| Need                                                | Source                                                     | Notes                                                                                                                                           |
| --------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Search, facets, pagination                          | Hydra Solr `access.redhat.com/hydra/rest/search/kcs`       | The search backend of catalog.redhat.com. No published schema: responses are validated with [zod](packages/backend/src/hydra/hydra-schemas.ts). |
| Repository, images, tags, CVEs, RPMs, Containerfile | Pyxis GraphQL `catalog.redhat.com/api/containers/graphql/` | Typed with GraphQL Code Generator against a committed schema snapshot ([`pyxis/schema.graphql`](packages/backend/pyxis/schema.graphql)).        |
| Pull                                                | the registry resolved from Pyxis                           | See below.                                                                                                                                      |

The search index reports `registry.access.redhat.com` even for repositories that registry refuses to serve, so the pull registry is resolved from Pyxis, with the catalog website rule ([`registry-resolver.ts`](packages/backend/src/catalog/registry-resolver.ts)):

```
Red Hat repository requiring terms   → registry.redhat.io           (Red Hat account required)
Red Hat repository without terms     → registry.access.redhat.com   (anonymous)
partner repository                   → its registry as-is            (registry.connect.redhat.com requires credentials)
```

Both APIs are internal to the catalog, without SLA or versioning: requests identify themselves as `podman-desktop`, are cached in memory with in-flight de-duplication, and a weekly [workflow](.github/workflows/catalog-api-drift.yaml) re-downloads the GraphQL schema and runs contract tests against the live APIs.

Red Hat Hardened Images (`registry.access.redhat.com/hi/*`) are the same images as the Hummingbird ones on `quay.io/hummingbird`: a local image from either location is shown as pulled.

## Architecture

```
packages/
  shared/    RPC contracts (abstract API classes + CHANNEL), DTOs, pull-spec helpers
  backend/   Inversify DI
             ├─ HydraSearchService   query builder + zod parsing + TTL cache
             ├─ PyxisService         typed GraphQL (generated) + TTL cache
             ├─ CatalogService       Pyxis → DTO mapping, registry resolution
             ├─ AuthService          redhat.authentication-provider session
             ├─ ImageService         pull (with sign-in retry), local images
             └─ ProviderService, WebviewService, RoutingService, DialogService
  frontend/  SvelteKit (static) + @podman-desktop/ui-svelte
             ├─ /                                     Explore
             └─ /repository/[registry]/[...repository] Details, tabs in ?tab=
```

The skeleton (RPC message proxy, Inversify services, webview) comes from the [Hummingbird extension](https://github.com/redhat-developer/podman-desktop-hummingbird-ext).

## Development

Prerequisites: Node.js 24 from [`.nvmrc`](.nvmrc) and the pinned pnpm version from [`package.json`](package.json).

1. Clone the repository and install dependencies:

   ```sh
   git clone https://github.com/axel7083/pd-redhat-catalog-ext.git
   cd pd-redhat-catalog-ext
   nvm use
   corepack enable
   pnpm install --frozen-lockfile
   ```

2. Build the extension: the shared package first, then the frontend into `packages/backend/media` and the backend into `packages/backend/dist`:

   ```sh
   pnpm build
   ```

   To rebuild automatically after source changes:

   ```sh
   pnpm watch
   ```

3. Run the checks (they need a build first, the shared package is consumed from `dist/`):

   ```sh
   pnpm typecheck
   pnpm lint:check
   pnpm format:check
   pnpm test            # unit tests
   pnpm test:contract   # live tests against the catalog APIs (network)
   pnpm measure         # cold latency of every catalog request (network)
   ```

4. Load the extension in Podman Desktop. For sibling directories:

   ```sh
   cd ../podman-desktop
   pnpm install
   pnpm watch --extension-folder ../pd-redhat-catalog-ext/packages/backend
   ```

   Run `pnpm watch` in this repository in a second terminal. **Red Hat Catalog** appears in the navigation bar.

### Changing a Pyxis query

Queries live in [`packages/backend/src/pyxis/queries.ts`](packages/backend/src/pyxis/queries.ts). After editing them, regenerate the types; codegen fails on any field or argument the schema does not have:

```sh
pnpm pyxis:codegen   # regenerate src/pyxis/generated from the snapshot
pnpm pyxis:schema    # refresh the schema snapshot from the live API
```

## Telemetry

When Podman Desktop telemetry is enabled, the extension reports: searches (whether a text was entered, which facets are filtered, sort, page, number of results; never the searched text), repository views (pull registry kind, cache hit, errors), pulls (registry host, by digest, sign-in retry, cancellation, errors), sign-ins and external links opened.

## Packaging and publishing

The Containerfile builds the extension from source. Build a local OCI image with:

```sh
podman build -t localhost/redhat-catalog-ext:dev .
```

For publishing instructions, see the [Podman Desktop publishing documentation](https://podman-desktop.io/docs/extensions/publish). The manually dispatched `release` workflow accepts a semantic version and branch, then publishes the image to `ghcr.io/<owner>/<repository>:<version>`. Stable releases also receive the `latest` tag; prereleases do not.

Every push to `main` publishes `ghcr.io/<owner>/<repository>:next` (and `:<commit sha>`) through the `next-build` workflow. Install it in Podman Desktop with **Extensions > Install custom...** to try unreleased changes.
