# Personal task data-access

Handwritten boundary around the generated Angular personal-task client. It maps
transport responses into presentation fields, applies request timeouts and uses
the application's existing cookie/XSRF HTTP providers.

`PersonalTaskApi` performs versioned task actions. `PersonalTaskList` is provided
by the Today feature and exposes resource-derived loading, error, items and
cursor state. It does not implement Today grouping or shared update streams.
Refresh invalidation is part of the resource parameters, so successful mutations
supersede any outstanding list read rather than losing a reload during loading.
The last displayed page remains visible during same-page refreshes and failures,
preserving keyed row identity and keyboard focus. Changing the cursor clears it.

Run `npm exec nx -- run web-tasks-data-access:test` and
`npm exec nx -- run web-tasks-data-access:lint` from the workspace root.
