# Occup authentication

`/signin` and `/signup` render the same `AuthLayout` and `AuthForm`; the route supplies `mode`. The form uses React Hook Form, Zod, `zodResolver`, and shadcn form primitives. Styling is scoped to `.auth-page` in `auth.css`.

Copy the public variables in `.env.example` into `.env.local` and restart Vite. `VITE_API_URL` is the backend origin, without `/api`. Requests default to `/api/auth/login` and `/api/auth/signup`; the current backend uses `/api/auth/sign-in` and `/api/auth/sign-up`, so the supplied environment overrides select those paths. Google and user requests use `/api/auth/google` and `/api/auth/user`.

`AuthProvider` supplies the context already referenced by `App` and the navigation. The backend uses bearer tokens. Remember me selects local storage; otherwise the token is stored in session storage. Passwords and full API responses are never persisted. Stored tokens are verified with `GET /api/auth/user` before the user is restored. Backend rejection clears an invalid token; a transient network failure does not erase it. The storage policy is isolated in `auth.storage.ts` so it can be replaced with a server-managed cookie flow later.

The current signup response contains a user without an access token. After signup, the form returns to sign-in with the email prefilled and a success message. A future signup response with an access token is also supported. Successful authentication updates context and returns to a safe internal `location.state.from`, or `/`.

Google authentication uses the official Google Identity Services button and ID credential callback. Set `VITE_GOOGLE_CLIENT_ID` to the OAuth **Web** client ID matching the backend's `GOOGLE_CLIENT_ID`, and register the frontend origin under Authorized JavaScript origins. The credential is sent to the backend for verification; the frontend never fabricates a Google user. Script failures offer retry and email sign-in. A live Google round trip requires configured credentials and an available backend.

Password rules mirror the backend, including its 72-byte UTF-8 bcrypt limit. Password recovery currently explains that resets are unavailable because no recovery endpoint exists.

Checks:

```sh
npx tsc -b --pretty false
npm run build
npm run lint
# With npm run dev running and VITE_GOOGLE_CLIENT_ID configured:
node --test tests/auth.schema.test.ts tests/auth.browser.mjs
```

Browser tests use Playwright Chromium (or installed Edge), isolated HTTP/Google fixtures, and all five requested widths. Screenshots go to `node_modules/.cache/auth-checks`. Fixtures only exist in tests; passing them verifies the frontend contract, not live backend or Google availability.
