# web-core-auth-data-access

Owns handwritten session state and generated-client orchestration. Session checks
run on entry/foreground return. `rxResource` owns the generated-client read,
loading/error state and cancellation; identity/status are computed from one typed
session result. Explicit invalidation replaces the resource value and cancels
outstanding reads. Sign-out is an `exhaustMap` mutation pipeline: it retrieves
CSRF proof, passes it directly to the generated sign-out call and derives activity
and failure signals from its result. Proof exists only within that request chain;
no authentication state is persisted in browser storage. The HTTP interceptor
records protected Daylo 401 responses. Auth also owns reusable access guards and
redirect decisions. `AuthSessionLifecycle` owns foreground checks and navigation
on session loss/sign-out independently of any mounted shell or feature.
Business mutation workflows remain in their own tasks.

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
