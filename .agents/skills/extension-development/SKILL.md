# Extension Development

Use this guide for end-to-end feature work across backend/frontend/shared.

## Workflow

1. Define or update the contract in `packages/shared` (API abstract class, DTOs), then `pnpm build:shared`.
2. Implement backend behavior in `packages/backend` (service + `apis/*-api-impl.ts`, bound in the `$module.ts` files).
3. Integrate UI in `packages/frontend`.
4. Validate with lint, typecheck, and tests.

## Typical touchpoints

- Shared API: `packages/shared/src/apis/catalog-api.ts`
- Backend impl: `packages/backend/src/apis/catalog-api-impl.ts`, `packages/backend/src/services/catalog-service.ts`
- Pyxis queries: `packages/backend/src/pyxis/queries.ts` (then `pnpm pyxis:codegen`)
- Frontend client: `packages/frontend/src/api/client.ts`

## Validation

```sh
pnpm build
pnpm typecheck
pnpm test
pnpm test:contract   # when touching Hydra or Pyxis queries
```
