@AGENTS.md

## Project notes

- Next.js 16 App Router with Cache Components on. Authenticated API routes go through `withAuth` in `src/lib/api.ts`, which calls `connection()` so they always run at request time.
- App pages under `src/app/app` are client components that fetch from `/api/*` with `useApi`.
- Database: Drizzle + libSQL. After changing `src/lib/db/schema.ts`, run `npm run db:generate` and commit the new file in `drizzle/`.
- Every AI call goes through `src/lib/ai/client.ts`. With no `ANTHROPIC_API_KEY`, each feature falls back to the offline engine in `src/lib/ai/heuristics.ts`; keep both paths working.
- Before pushing: `npm run lint && npm run typecheck && npm test && npm run build`.
