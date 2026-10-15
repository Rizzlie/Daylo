# F02-03 — Local stack launcher

Parent: F02 · [Task index](../tasks.md) · [Backlog](../backlog.md)

## Assumptions and scope

Owner request on 2026-10-15: provide one command starting the existing PostgreSQL
image, API and web. Reuse Docker Compose and Nx targets. PostgreSQL keeps its
persistent volume; API/web run on the host. No dependency or application changes.

## Discussion and decisions

The owner explicitly requested implementation, then directed simplification to
`nx run-many`. The final implementation is an npm script chaining Compose health
wait, the existing Prisma migration target and `nx run-many -t serve -p api web`.
There is no custom Node/PowerShell launcher or extra validation/check mode.
Use existing environment loading and require configured `.env`/Google settings.
The web serve target sets its own PORT=4200 through Nx run-commands, delegating
to `web:serve-app` (the original Angular executor). Angular's PORT environment
overrides the builder port option, so this scope prevents the API's root
PORT=3000 from redirecting the frontend onto the API port.

## Acceptance criteria

- `npm run dev` starts Compose PostgreSQL, applies committed migrations and runs
  the existing API/web servers through Nx.
- Failed Compose/migration commands stop the chain; no database reset or secret
  generation occurs. Existing environment files stay unchanged.
- Web is at localhost:4200; API at localhost:3000; frontend proxy reaches API.
- Ctrl+C stops servers; database data remains. Separate stop is documented.

## Verification

Live startup, database readiness, frontend proxy, login-page browser smoke and
Ctrl+C cleanup. No feature changes or unrelated test suite reruns are required.

## Delivery and retrospective

Implemented and locally verified on 2026-10-15; owner-accepted on 2026-10-15.
`npm run dev` passed the Compose health wait and committed migration target,
then started API and Angular on their intended ports. HTTP 200 confirmed direct
API database readiness, web, and proxied `/api/health/ready` with database up.
Browser smoke confirmed `/login`, the Daylo title and Google sign-in control;
real Google sign-in was not attempted. Ctrl+C stopped the owned server processes;
ports 3000 and 4200 were released. The development database was stopped after
inspection to restore its initial stopped state, retaining its volume. Startup
applied the two already-committed pending development migrations; the subsequent
run found the database current. The API daemon was disabled in the tool
environment, so API watch/restart behavior was not established. No application
logic changed; no unrelated test reruns.

The initial custom launcher was overengineered; owner review correctly reduced
orchestration to existing tools. Prefer Nx composition for this workflow. Runtime
smoke caught Angular's environment PORT precedence; scoping PORT in the web target
resolved it. No custom launcher or additional dependency remains.
Publication review preserved the public web serve target's development/production
configurations, each delegating to the corresponding Angular serve-app target.
