# web-core-shell

Contains F06-04 empty protected Today/invitation destinations.
Application routes lazily load the public `WebCoreShell` component.
The login page belongs to `@daylo/web/auth/features/login`; route composition
belongs to `apps/web`, which imports authentication providers and guards directly.
Full navigation, feature content and preferences remain later tasks.

Reusable guards and `getAuthRedirectUrl` belong to auth data-access. Templates
read separate named signals for loading, heading and sign-out state, without a
combined view model. Shell displays session data and invokes sign-out; it does not
listen for visibility events, check access or navigate on session loss. The auth
lifecycle provider registered once by the app owns those responsibilities.

## Running unit tests

Run `npm exec nx -- run web-core-shell:test`.
