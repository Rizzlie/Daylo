# F06-09 — Production security headers

Parent: F06 · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: Planning requested on 2026-10-13; implementation details pending.
Implementation authorization: Not granted. Delivery status: Pending.

## Assumptions and sources

The [auth audit](../security/auth-audit-2026-10-13.md) found no application-level
security header configuration. No current XSS bypass is claimed. Inspect the real
production serving/proxy topology before implementation: headers on API responses
alone do not protect the Angular HTML document. Preserve existing Material themes,
Google Fonts, Swagger, OAuth redirects and local development.

## Scope

- Configure supported security headers for the installed Nest version and for
  the server/proxy serving the frontend; use Helmet where appropriate.
- Define CSP for Angular, Material and approved asset origins, with supported
  nonce handling where required. Nonces must be unpredictable per response and
  consistent between policy and document. Avoid blanket unsafe script allowances.
- Add frame protection, MIME sniffing protection, suitable referrer policy and
  production HTTPS HSTS. Agree subdomain/preload policy rather than enabling it
  blindly. Avoid forced production HTTPS policies in local HTTP development.
- Validate CSP in report-only mode before enforcement; define safe report handling
  and explicit Swagger/resource exceptions without weakening the frontend policy.

## Acceptance criteria

Deployed frontend HTML and relevant API responses carry the agreed headers.
Normal Google navigation, styles, icons, fonts, lazy loading and Swagger work.
Unapproved script execution and framing are blocked under the enforced policy.
Reports contain no authentication secrets; HTTPS and development behavior match
the agreed topology, with deployment checks explicitly recorded.

## Verification

Header/nonce integration tests and production build checks through Nx. Inspect
the actual served app on desktop/mobile, both themes, including Material controls
and overlays, console/CSP diagnostics, Swagger and OAuth navigation. Record checks
requiring unavailable deployment infrastructure as incomplete.

## Discussion topics and decision record

Agree hosting topology, TLS termination, asset allowlist, CSP/nonces/reporting,
rollout, HSTS duration/subdomain policy and development exceptions. The owner
requested backlog registration on 2026-10-13; no deployment or implementation is authorized.

## Delivery and retrospective

### Discussion order — 2026-10-13

The owner requested deferral with "hmm, to może na końcu" after F06-08.
Defer this task until hosting/HTTPS topology is decided, before public exposure.
The owner then selected F06-10. This does not authorize F06-09 implementation
or deployment and does not change its pending status.

Documentation registered; implementation, verification and acceptance pending.
Validate headers where HTML is actually served and enforce CSP after compatibility checks.
