# Web UI (interfaces layer)

Client-side modules for the Next.js app router pages in `app/`. Pages stay
thin; everything reusable lives here.

## Structure

- `api/http.ts` — core transport: base URL (`NEXT_PUBLIC_API_BASE_URL`,
  defaults to same-origin), credentials, JSON encoding, and `ApiError`
  normalization. Nothing else calls `fetch`.
- `api/client.ts` — **the single typed API client**. One method per backend
  endpoint, typed with the application-layer DTOs (type-only imports, so the
  dependency rule holds: interfaces → application). Screens import `api` and
  never build URLs or headers themselves.
- `hooks/useApiQuery.ts` / `hooks/useApiMutation.ts` — the data-fetching and
  state convention (see below).
- `auth/AuthProvider.tsx` — session context for the authenticated area;
  `useAuth()` exposes the current user, `refresh()`, and `logout()`.
- `components/` — shared UI (e.g. `AppShell` with header/nav).

## Data-fetching & state convention

Screens are client components and follow one pattern:

```tsx
'use client';

// Reads: useApiQuery(fetcher, deps) → { data, error, isLoading, refetch }
const tablesQuery = useApiQuery(() => api.tables.list(), []);

// Writes: useApiMutation(api.method) → { mutate, isPending, error, reset }
const createTable = useApiMutation(api.tables.create);
const result = await createTable.mutate(input); // undefined on failure
if (result) {
  tablesQuery.refetch(); // refresh affected reads after a successful write
}
```

Rules:

1. All backend access goes through `api.*` — no raw `fetch` in pages or
   components.
2. Reads render the three states explicitly: loading message, error box with
   a Retry button (`refetch`), then data.
3. Writes disable their submit control on `isPending` and render
   `mutation.error.message` inline; on success, `refetch()` the queries whose
   data changed.
4. Expired sessions (401) on reads redirect to `/login` automatically inside
   `useApiQuery`. Mutations surface the 401 instead (login itself needs it).

## Auth flow

- Session token is an httpOnly cookie set by `POST /api/auth/login`; the
  browser sends it automatically, so the client adds no auth header.
- `middleware.ts` (repo root) redirects pages by cookie presence:
  no cookie → `/login?next=…`; cookie on `/login` → `/`.
- `AuthProvider` (mounted by `app/(app)/layout.tsx`) verifies the session via
  `GET /api/auth/me` and redirects to `/login` if it is invalid.
- Logout is `POST /api/auth/logout` (clears the cookie) + redirect, via
  `useAuth().logout()`.
