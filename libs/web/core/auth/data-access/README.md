# web-core-auth-data-access

Owns handwritten session state and generated-client orchestration. Session checks
run on entry/foreground return. `rxResource` owns the generated-client read,
loading/error state and cancellation; identity/status are computed from one typed
session result. Explicit invalidation replaces the resource value and cancels
outstanding reads. Sign-out is an `exhaustMap` mutation pipeline calling the
generated `signOut()` method without a token argument or preliminary CSRF request.
Angular's built-in XSRF interceptor reads the host-only `daylo_xsrf` cookie and
adds `X-CSRF-Token` on eligible same-origin mutations. The backend issues/repairs
this readable cookie on sign-in and GET session, binds it to the database session
and clears it on sign-out/invalid sessions. The authentication cookie stays
HttpOnly; no authentication state is persisted in localStorage/sessionStorage.
The handwritten HTTP interceptor
records protected Daylo 401 responses. Auth also owns reusable access guards and
redirect decisions. `AuthSessionLifecycle` owns foreground checks and navigation
on session loss/sign-out independently of any mounted shell or feature.
Business mutation workflows remain in their own tasks.

HTTP 429 is separate from session expiry. Session checks select the fixed
`rate-limit` login notice; rate-limited CSRF/sign-out leaves the active session
and protected screen available. Recovery follows a user action, without an
automatic retry loop.

Application bootstrap imports `provideAuthentication` directly from
`@daylo/web/core/auth/data-access` and registers `provideAuthSessionLifecycle()`
once alongside `provideRouter`. Keeping lifecycle registration explicit allows
transport/session tests to use the authentication provider without a router.
The root lifecycle service has one listener with injector-managed cleanup.
`authGuard` is reusable on any active-user
route: it permits accessible destinations rather than forcing `/today`. Set route
data `authAccess: 'pending'` or `'authenticated'` only for the corresponding
explicitly eligible route. `loginGuard` owns public login entry/recovery.
`getAuthRedirectUrl(session, access)` returns a required authentication redirect,
or `null` when no redirect is needed. It neither checks the session nor navigates.
The project's narrow `capability:auth-bootstrap` permits app composition imports;
other frontend data-access libraries retain their existing app restrictions.

Protected routes or parent route groups declare `data.authAccess` as `'active'`,
`'pending'` or `'authenticated'`. Lifecycle uses the nearest policy on the active
primary route; public or unmarked routes do not trigger foreground renewal or
loss redirects. Guards still enforce entry access. The public login route declares
`'public'`, so foreground events preserve recovery notices. Checks ignore hidden
pages, sign-out and active navigation, suppress concurrent foreground requests,
and discard redirects from responses for a route that has since changed.

## Running unit tests

Run `npm exec nx -- run web-core-auth-data-access:test`.
