# Public application configuration

`provideDayloConfiguration()` waits for the generated `GET /api/configuration`
client before application bootstrap completes (15-second request deadline).
Consumers use `inject(DAYLO_CONFIG)` to read the frozen configuration synchronously.
The provider makes one request per application instance. HTTP caching uses ETag
and `Cache-Control: no-cache`, so subsequent page loads revalidate stored data.
No browser-local fallback or stale offline configuration is used. Startup failure
leaves a persistent error and a reload action outside the Angular application.
Reload the page after changing installation configuration and restarting the API.

Run `npm exec nx -- run web-core-configuration-data-access:test` from the workspace root.
