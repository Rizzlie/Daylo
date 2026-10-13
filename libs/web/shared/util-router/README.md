# web-shared-util-router

Shared Angular router utilities, generated as a non-buildable Nx library.

`injectQueryParamMap()` returns `Signal<ParamMap>` for the current activated
route, with an immediate snapshot value and updates from `queryParamMap`.
Call it in an Angular injection context, typically a component field initializer:

```ts
private readonly queryParams = injectQueryParamMap();
```

Angular owns the subscription lifecycle through `toSignal`. This browser-specific
utility has tags `platform:web`, `scope:shared`, `type:util` and no business-area
dependencies. Platform-neutral utilities remain Angular-free.

`injectRouteData()` similarly returns `Signal<Data>` for static and resolved
data on the current activated route, starting with `snapshot.data` and following
`route.data` updates. Use it in a field initializer:

```ts
private readonly routeData = injectRouteData();
```

## Running unit tests

Run `npm exec nx -- run web-shared-util-router:test`.
