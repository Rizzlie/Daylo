# F06-02 — Identity and application admission

Parent backlog item: **F06** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: **Complete — scope agreed with the owner on 2026-10-12.**
Implementation authorization: **Granted by the owner on 2026-10-12 for the agreed scope.**
Delivery status: Closed — implemented, locally verified and owner-accepted on 2026-10-12. Browser inspection remains partial.

## Assumptions and sources

- Google backend-owned OIDC and database-backed cookie sessions are fixed architecture choices. Owner, active user, pending invitee and outsider have different access. Controlled-provider verification does not prove real Google configuration.
- Dependencies: F06-01. Confirm their delivered and verified behavior before dependent work.
- Read [product requirements](../product-requirements.md), [architecture](../architecture.md) and [backlog](../backlog.md). Apply the relevant [frontend](../frontend-architecture.md), [backend](../backend-architecture.md) and [design-system](../design/design-system.md) rules.
- This is a proposed bounded task. Inspect discoverable implementation facts; resolve material product decisions with the owner during the discussion.

## Work to perform

- [x] Implement identity and admission through narrow user/invitation contracts: configured owner, existing active users, matching eligible pending invite, outsider denial.
- [x] Add only admission queries needed now; invitation management comes in M03.

## Acceptance criteria

The work above must satisfy this task-specific observable outcome:

Stable Google subject identifies the user; owner/active/pending/outsider and expired/wrong-email invitation cases produce correct access.

The owner confirmed the criteria and behavior below on 2026-10-12. Applicable checks must pass, evidence and limitations must be recorded, and no blocking defect may remain. Implementation, verification and owner acceptance are tracked separately.

## Verification plan

- [x] Stable Google subject identifies the user; owner/active/pending/outsider and expired/wrong-email invitation cases produce correct access.

- Inspect available Nx targets and use project generators/targets where applicable; select exact commands after inspection rather than inventing flags.
- Run affected lint, meaningful tests and production builds. For API contract changes, export/validate OpenAPI, regenerate the Angular client and check drift.
- For user-facing changes, run applicable real-stack Playwright scenarios and independently inspect the running UI through an available browser tool at relevant desktop/mobile widths, including keyboard behavior and console/network errors where supported.
- Use synthetic data and keep secrets, authentication state, reports, screenshots and traces out of version control.
- Record unavailable checks as incomplete. For review/manual-only tasks, mark inapplicable automated checks with a reason; do not rerun unrelated checks solely to fill the report.

## Discussion before implementation

Discuss this task with the owner before application changes:

1. How should owner email configuration and invitation email matching be normalized, and which profile changes should be refreshed at sign-in?
2. Confirm assumptions, dependencies, scope boundaries and the observable acceptance scenarios above.
3. Agree on implementation approach, affected areas, required checks and any remaining limitations; resolve material ambiguities explicitly.

Record the discussion outcome below. Agreement on documentation alone is not implementation authorization. Start implementation only after the discussion is complete and the owner explicitly requests implementation of the agreed scope. Do not interpret silence or a request to discuss as approval.

### Decision record

- Discussion date: 2026-10-12.
- Agreed assumptions and behavior: Resolve identity by stable Google subject, never by email alone. Normalize configured owner and verified Google emails using trimming and lowercase only; preserve dots and plus suffixes. Refresh email and supplied Google display name on admitted sign-in; preserve an existing name when absent, and use the email local part (bounded to the existing 200-character field) for a new user without a name. Avatar remains excluded. The configured owner is active; existing active users retain access. Everyone else requires a matching pending invitation with expiresAt strictly later than the admission check, and remains pending until explicit invitation acceptance. Existing pending users must still have an eligible invitation. Deny outsiders, ineligible invitations and an email already belonging to another subject with safe HTTP 403, without creating a user or modifying the denied identity.
- Agreed scope and exclusions: Identity persistence and admission integrated after real Google verification. Narrow Users and Groups contracts and only necessary admission persistence queries. No invitation management/resolution, membership creation, sessions, CSRF, frontend authentication or avatar. Admitted callbacks retain safe HTTP 503 until F06-03; denied callbacks return 403 without identity disclosure.
- Agreed approach and verification: Official Nx generators for necessary area libraries; application-root module wiring; Prisma adapters sharing an explicit transaction. Test owner, active, pending, outsider, wrong-email/expired/resolved invitations, profile updates, email collisions and concurrent logins using synthetic data, including isolated PostgreSQL. Run affected lint/tests, API production build, OpenAPI validation, official client regeneration and source-preserving drift checks. Record browser applicability and incomplete full-login verification accurately.
- Unresolved questions: None for this bounded scope.
- Owner implementation authorization: "Tak, zapisz ustalenia i zacznij pracę", 2026-10-12, following the proposed behavior, scope, approach and verification discussion.

## Scope boundaries

Only the work listed above belongs to this task. Follow the parent backlog boundary and approved architecture; do not implement subsequent tasks, speculative libraries or deferred MVP features. Preserve existing delivered work and original design exports. Git initialization, commits, publication and deployment require their own authorization.

## Delivery and review record

- Delivered behavior: Added only the necessary Users/Groups contract, data-access and feature composition libraries using the official Nx JS library generator. Auth wires admission after signed Google identity verification and consumes narrow contracts supplied by the application root. Subject-based identity, normalized owner configuration, existing active access, eligible pending invitation checks, denied email collisions and admitted profile refresh follow the agreed rules. Incoming subject/email advisory locks serialize first sign-in and profile changes in one existing transaction runner; the selected invitation is held with FOR SHARE through commit. No Prisma migration or npm dependency was required. Admitted callbacks persist/refresh a user then retain the intermediate safe 503; denied callbacks return safe 403 with no profile writes. No session, membership, invitation resolution or provider-token persistence is added. OpenAPI and the official Angular client were regenerated, including the 403 documentation and concrete error example.
- Checks executed and outcomes: On 2026-10-12, fresh api:test passed all 104 tests, including 17 admission PostgreSQL cases and seven signed-token PostgreSQL HTTP cases. The 14 admission policy cases cover normalization, subject identity, active/pending policy, collisions and safe infrastructure failures. api-core-configuration:test passed all 21 cases; api-auth-data-access:test passed all three real PostgreSQL transaction cases. An existing migration applied successfully to the fresh isolated daylo_f06_02_verify database in a disposable PostgreSQL 17 container. Concurrency checks cover eight first sign-ins of one subject, eight subjects claiming one owner email, concurrent email changes and single-use HTTP callbacks. Affected lint passed, including all six generated area libraries, Auth, configuration, database, API and generated client. API and frontend production builds passed, as did Angular client compilation, offline OpenAPI export/validation and source-preserving drift checks with two identical generations. The final drift check after adding the explicit 403 example passed. git diff --check passed. Full frontend authentication E2E is inapplicable to this slice because session completion and authentication UI remain F06-03/F06-04/F07.
- Browser scenarios and viewport coverage: Started actual API, Angular proxy and isolated PostgreSQL using synthetic environment overrides. Readiness returned 200. T3 browser navigation at 1280x800 loaded Swagger through localhost:4200/api/docs; expanded the Google callback operation and inspected its admission/403 documentation using the browser DOM. Swagger resource diagnostics showed no failed resource requests at that point. At 390x844, browser navigation to the real callback without a transaction returned the safe 401 GOOGLE_AUTHENTICATION_FAILED body. No Google account/credentials were used. This inspection did not exercise a successfully verified identity through the browser; signed-provider admission acceptance was covered by the real PostgreSQL HTTP tests instead.
- Known limitations / incomplete verification: T3 preview snapshots failed twice, preventing visual/screenshot verification; the browser host subsequently disconnected, so further desktop checks and console inspection remain incomplete. No new Angular UI was delivered. Full login browser E2E, sessions/CSRF and real Google sign-in are not claimed and remain their later tasks. PostgreSQL suites remain opt-in in ordinary CI; hosted CI was not run. Local .env/.env.local did not contain INITIAL_OWNER_EMAIL during inspection; the owner must set their verified Google email before ordinary API startup. Tests and browser inspection supplied synthetic overrides without changing local credentials. Temporary services and the isolated database/container are cleaned up after verification.
- Owner acceptance: Granted on 2026-10-12 through "okej, to akceptuje te zmiany. wystawiamy PR". Acceptance covers the delivered F06-02 scope and acknowledges the recorded verification limits. PR publication is separately authorized by the same instruction. The next task remains pending.
- Retrospective and workflow improvements: A production compile does not verify NestJS provider visibility: initial tests exposed a missing direct database-module import in Auth, which was corrected and reverified. Keep database assertions scoped to each suite's synthetic subjects rather than total user counts because independent Vitest files share the isolated database concurrently. Inspect Swagger's rendered error examples; the new 403 now has an explicit safe example. Nx formatting found no installed formatter; production additions were formatted manually without adding a dependency. Browser navigation/evaluation can remain available when snapshots fail, but DOM inspection must not be reported as visual verification.

Update this record and the parent backlog after delivery/review. Do not mark the parent item accepted until all of its criteria are met and the owner accepts it.

### Local runtime follow-up — 2026-10-12

The owner reported generic HTTP 503 immediately at `/api/auth/google`. Diagnosis
confirmed that both direct and proxied readiness failed: the configured development
database at localhost:5433 was not running, while the unrelated homey database was
on 5432. Started the existing Daylo Compose PostgreSQL service. Readiness then passed,
but the Daylo database was empty, so applied the existing approved initial migration
through `api-core-database:prisma-migrate-deploy` using the local connection setting.
No new schema or application code was added. Both required tables now exist and
proxied readiness returns 200. OAuth start returns 302 to accounts.google.com with
the browser-binding cookie; no real Google exchange/sign-in was performed. Removed
only the diagnostic OAuth attempt and left development PostgreSQL running for the
owner's manual test. This follow-up does not establish real sign-in or owner acceptance.

### Owner manual check and acceptance — 2026-10-12

After correcting their Google client configuration, the owner reported the exact
expected callback response: HTTP 503 SERVICE_UNAVAILABLE with message
"Daylo sign-in completion is not yet available". This is owner-reported evidence
that real Google verification and Daylo admission reached the intermediate completion
boundary. It does not establish a Daylo session, independently inspected identity
or the full F06-05 smoke exercise. The owner then accepted F06-02 and authorized PR
publication. Hosted CI and the recorded visual/console inspection gaps remain open.

During local runtime diagnostics the agent read ignored environment files. The owner
explicitly prohibited any further reads of `.env` and its variants. Future agent
inspection must use `.env.example` and owner-supplied information, without reading
secret environment files directly or through diagnostic scripts.
