# Admin table management

`/admin/tables` uses the existing `AuthProvider`, Occup logo/design tokens, React Hook Form, Zod, and shadcn/Base UI components. `/admin` redirects to the table page. Session restoration completes before the admin role check; unauthenticated users go to `/signin` with a return path, and customers go to `/`.

The table service calls `GET /api/admin/tables`, `POST /api/admin/tables`, and `PATCH /api/admin/tables/:id` using `VITE_API_URL` and the access token from auth context. It validates response envelopes, times out requests after 15 seconds, and maps errors to safe messages. There are no demo records or fallback backend URLs in the app. Search and both filters run on the fetched data. Mutations update the list only after the backend confirms success.

`TableForm` is shared by create/edit modes. Empty locations are sent as empty strings so edits can clear a location without sending `null`, which the API validator rejects. The form enforces a 10-character table-number limit because the database column is `varchar(10)`; the current backend validator permits 20. Capacity is bounded by the database's positive 32-bit integer column. No backend changes are needed for these frontend safeguards.

Dashboard, Reservations, and Settings appear as disabled navigation items because this project has no corresponding admin pages yet. View Site and Log out use the existing router/auth behavior. Only Active/Inactive are table statuses; no reservation state is inferred.

## Checks

From `frontend`, with Vite running on port 5173:

```sh
npm run dev
node --test tests/admin-tables.browser.mjs
npx tsc -b
npm run lint
npm run build
```

The browser suite uses isolated HTTP fixtures to cover admin protection, request authentication, combined filters, form validation, duplicate errors, create/edit, activation, failures, loading, empty lists, logout, and viewport widths 320/375/768/1024/1440. Screenshots are saved under `node_modules/.cache/admin-table-checks`. Set `ADMIN_TEST_URL` to use another frontend origin. An authenticated live-backend CRUD check requires an existing admin session; browser fixtures do not authenticate against or change the real database.
