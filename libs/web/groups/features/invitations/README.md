# web-groups-feature-invitations

Dedicated `/invitations` route page, imported through
`@daylo/web/groups/features/invitations` as `Invitations`. Tags: `platform:web`,
`scope:groups`, `type:feature`. Application routing lazily composes it under the
protected core shell and enforces pending-user access.

Owns the existing session-based greeting and Material card with
its `Zaproszenia` heading. It does not derive page identity from route data.
Invitation retrieval, acceptance/rejection and group-management UI remain pending
in M03. Session validation/loading belongs to the route guard and authenticated
shell. The shared application frame remains in `@daylo/web/shared/ui`.

Run `npm exec nx run web-groups-feature-invitations:test` and
`npm exec nx run web-groups-feature-invitations:lint`. The web build compiles this
non-buildable library.
