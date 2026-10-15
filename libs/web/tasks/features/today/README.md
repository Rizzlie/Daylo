# web-tasks-feature-today

Dedicated `/today` route page, imported through
`@daylo/web/tasks/features/today` as `Today`. Tags: `platform:web`, `scope:tasks`,
`type:feature`. Application routing lazily composes it under the protected core
shell and enforces active-user access.

Owns the existing session-based greeting and Material card with
its `Dzisiaj` heading. It does not derive page identity from route data. Task
retrieval, sections, counters, editing and quick creation remain pending in M02.
Session validation/loading belongs to the route guard and authenticated shell.
The shared application frame remains in `@daylo/web/shared/ui`.

Run `npm exec nx run web-tasks-feature-today:test` and
`npm exec nx run web-tasks-feature-today:lint`. The web build compiles this
non-buildable library.
