# web-auth-feature-login

Owns the F06-04 login page, fixed Polish authentication notices and connection
recovery. Application routing lazily loads `Login` from
`@daylo/web/auth/features/login`. Shared session state, guards and redirect rules
remain in core auth data-access. The shell does not import this feature.

The template reads named signals (`isLoading`, `notice`, `canRetry`), without a
combined view model. `injectQueryParamMap` from shared util-router provides the
current query parameters as a signal; arbitrary query text is never rendered.

## Running unit tests

Run `npm exec nx -- run web-auth-feature-login:test`.
