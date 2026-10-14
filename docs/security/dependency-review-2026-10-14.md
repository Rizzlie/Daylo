# Daylo dependency security review — 2026-10-14

Task: [F06-12](../tasks/F06-12-security-dependency-review.md).
The baseline review below was authorized as read-only work. The owner subsequently
authorized its bounded remediation with Nx migration first. Baseline pending-state
statements are preserved as history; the remediation record below supersedes them.
Major migrations, CI policy changes and publication remain outside authorization.

## Findings and evidence limits

Fresh registry reports returned 55 affected package entries in the full workspace
(2 critical, 34 high, 19 moderate), and 9 with `--omit=dev` (6 high, 3 moderate).
The full report contains 30 unique advisory IDs. Parent packages inherit findings;
the two critical entries are Piscina and its parent `@angular/build`, representing
one advisory, not two distinct critical vulnerabilities.

An additional `npm audit --prefix dist/apps/api --omit=dev --json` against the
existing generated API lockfile returned 4 entries (1 high, 3 moderate): lodash,
js-yaml and their Nest parents. This artifact's main.js was last written on
2026-10-14. It was inspected, not rebuilt or deployed for this review. Its generated
manifest includes Nest configuration/Swagger, Google auth and the PostgreSQL
adapter, but not Prisma CLI, Axios, Piscina or Angular CLI. The current webpack
configuration externalizes dependencies and generates that manifest. Deployment
must preserve this separation; installing the entire workspace on a server changes
the installed exposure. No deployed host or production installation was inspected.

No remotely exploitable application path was demonstrated in this source review.
This does not establish that all vulnerabilities are unreachable. Development
servers and CI remain security boundaries; trusted source/configuration assumptions
must be reevaluated for untrusted pull requests, plugins or exposed development
servers. Scanner counts alone do not prove application exploitability.

## Reachability groups

The advisory inventory below maps every distinct finding to one group. All package
updates remain pending; “inapplicable” refers to the stated attack condition in the
inspected configuration, not disappearance of an installed vulnerable version.

| Group | Inspected path and attack conditions | Assessment and proposed treatment |
| --- | --- | --- |
| A — Angular router | `web:build` uses `@angular/build:application` with a browser entry and no SSR entry/options. The maintainer explicitly excludes client-only SPAs. | SSR attack inapplicable to current Daylo. Update Angular coherently for hygiene; reassess if SSR is added. |
| B — Nest/lodash | Nest Config uses lodash get/has/set with application-owned configuration. Swagger uses omit with fixed/internal metadata paths. No handwritten lodash template/imports or user-controlled omit/unset path was found. Swagger has a separate nested patched lodash; the vulnerable root copy is used by Config. | Runtime package present; remote exploit path unproven. Update Config to 4.0.4, which declares lodash 4.18.1. Do not claim the deletion-only omit/unset advisories establish the arbitrary property-write primitive needed by other gadgets. |
| C — YAML | Swagger's inspected code calls js-yaml dump on the internally generated specification; it does not load request YAML. An older js-yaml also exists through coverage tooling, outside the advisory's affected 5.x range. | Runtime package present, but vulnerable loader path not found in Daylo. Propose a narrowly scoped Swagger js-yaml 5.4.1 override, subject to explicit approval and contract verification; Swagger 11.4.7 pins 5.3.0 and no newer stable 11.x was returned. Avoid automatic Swagger 12 migration. |
| D — Prisma config | Prisma CLI brings deepmerge-ts 7.1.5 and mysql2 3.15.3. `prisma.config.ts` contains fixed schema/migration locations. Prisma schema is PostgreSQL and runtime uses PrismaPg. Existing API artifact excludes these CLI dependencies. Deepmerge requires recursive object graphs; MySQL findings require a MySQL connection, with compression for the inflate finding. | MySQL conditions inapplicable to current PostgreSQL paths. Recursive untrusted config path unproven. Defer parent remediation with reasons; latest stable Prisma 7 returned is already 7.10.0. Do not accept audit's downgrade to 6.19.3 or override deepmerge to major 8 without separate review. |
| E — Piscina | Angular builder uses Piscina 5.2.0 in build/dev tooling. The advisory requires an independent same-process Object.prototype pollution primitive before worker creation/options are read. Piscina is absent from API manifest. | Conditional tooling risk, high remediation priority because impact can be code execution. Upgrade Angular build to 22.2.2, declaring fixed Piscina 5.3.2. No pollution-to-worker exploit was tested or established. |
| F — Angular CLI MCP | CLI 22.1.9 brings SDK 1.30.0. Its inspected MCP command serves stdio; the advisory concerns HTTP OAuth client credentials sent to an attacker-selected authorization server. Daylo OAuth uses google-auth-library, not this SDK. | Advisory OAuth-client path not found in inspected Daylo/CLI command. Update CLI with the Angular tooling set; 22.2.2 declares the split MCP server package. This does not assess external agent hosts or their own installed SDKs. |
| G — Axios/Nx | Axios 1.18.1 is a development dependency through Nx, not Google auth or the API artifact. Findings require particular adapters/options, attacker-controlled URLs/redirects, proxy policy assumptions, or an independent prototype-pollution primitive. | Tooling exposure; per-advisory prerequisites are recorded below. No Daylo request path uses Axios. Nx 23.3.0's registry manifest removes Axios; upgrade all direct Nx packages together. Nx's internal call sites and every CI/proxy configuration were not exhaustively traced; do not mark all tooling conditions inapplicable. |
| H — glob/parsers | brace-expansion 5.0.9 and smol-toml 1.6.1 come through Nx/tooling. braces 3.0.3 propagates through micromatch/fast-glob, Analog ts-morph and webpack development proxy/watch tooling. These findings require hostile glob/TOML strings, not ordinary Daylo API payloads. | Update Nx to 23.3.0 (brace-expansion 5.0.12, smol-toml 1.9.0) and Analog packages to 2.8.0 (removes its ts-morph/fast-glob chain). Re-audit remaining watcher/proxy chains. braces has no patched release in the advisory; retain an explicit conditional tooling exception if it remains. Do not assume removal of one parent removes every copy. |
| I — sprintf | sprintf-js 1.0.3 comes through argparse and older YAML/coverage/Jest tooling; precision-controlled format strings cause RangeError. It is absent from the API artifact lockfile report. | Tooling path, attacker-controlled format string not found in Daylo. No patched version is listed. Re-audit after parent updates and record any residual exception rather than forcing unrelated major changes. |
| J — uuid | uuid 8.3.2 comes through SockJS/webpack-dev-server. Inspected SockJS calls v4 without an output buffer, whereas the advisory concerns v3/v5/v6 external-buffer bounds. | Inspected SockJS call inapplicable. No handwritten affected uuid call was found. Reassess residual packages after tooling updates; avoid forcing a uuid major across an older parent. |

## Proposed bounded remediation

1. Upgrade `@nestjs/config` 4.0.2 → 4.0.4 and verify removal of vulnerable root
   lodash. Add an explicitly approved, parent-scoped js-yaml 5.4.1 override for
   Swagger 11.4.7 instead of introducing Swagger 12. Keep contracts unchanged.
2. Align Angular runtime/compiler/language-service and CLI/devkit/build/schematics
   packages on 22.2.2. Keep Material/CDK's existing 22.2.1 unless peer resolution
   requires adjustment. Builder metadata supports TypeScript >=6.0 <6.1, matching
   6.0.3. This resolves router/Piscina and changes CLI's MCP dependency chain.
3. Align Nx and every direct `@nx/*` package on 23.3.0 using the supported Nx
   migration workflow; inspect generated migrations before applying them. Nx
   Angular peers support Angular/build 22.x. Upgrade both Analog Angular packages
   2.6.4 → 2.8.0; their published peers accept current Vite 8 and Vitest 4.
4. Regenerate through npm, then re-audit the complete and production/artifact trees.
   Keep a finding-by-finding residual record for Prisma CLI, unpatched braces or
   sprintf, and any newly introduced findings. No speculative package deletion,
   force fix, major migration or arbitrary global override is included.

Registry metadata and peer ranges are compatibility evidence, not proof of a
successful installation or runtime. Exact resolution, migration effects and
residual counts must be verified during an authorized implementation. The Angular
client generator's pinned ngVersion must be inspected and aligned as needed through
its normal generation workflow; generated client files must not be hand edited.

## Verification plan and recurring review proposal

For approved remediation: use an isolated clean `npm ci` installation; inspect peers
and lockfile drift; run affected Nx lint/tests and API/web production builds,
PostgreSQL-backed auth/configuration/cleanup regression, OpenAPI/client generation,
source-preserving drift and client compilation. Run the real-stack desktop/mobile
auth E2E and inspect the running UI through an available browser tool because
Angular runtime/build packages change. Audit the fresh pruned API artifact as well
as the workspace. Do not rerun identical suites without a concrete concern.

Propose owner-led review monthly and before public release, with a fresh report,
reachability/exception reassessment and current fixed ranges. This policy is not
approved or implemented; no CI gate, external service or automation was added.

This review ran audits, npm explain/view, official GitHub advisory reads, Nx project
queries and source/artifact inspection. No dependency installation, package update,
test/build execution or exploit/load test was performed. Browser verification is
inapplicable to the documentation-only review and remains required after frontend
dependency changes. No remediation, human acceptance or full F06 completion is
claimed. Raw reports were saved in the operating-system temporary directory.

Retrospective: audit actual runtime artifacts alongside workspace classifications;
deduplicate parent entries; distinguish conditional gadgets from the prerequisite
vulnerability; verify parent manifests before proposing major changes.

## Advisory inventory

Current sources: fresh npm registry audit plus each official GitHub Advisory API
record fetched on 2026-10-14. Fixed versions include alternate package lines from
the official records; use the compatible installed line when choosing remediation.
Every entry is pending remediation or exception approval,
with reachability assessed by its group above. No finding was suppressed.

| Advisory | Package/version | Severity | Affected range (registry) | Fixed version | Group |
| --- | --- | --- | --- | --- | --- |
| [GHSA-ff3f-86qr-9cv3](https://github.com/advisories/GHSA-ff3f-86qr-9cv3) | @angular/router 22.1.8 | high | `>=22.0.0 <22.2.0` | 22.2.0, 21.2.24, 20.3.32 | A |
| [GHSA-6qxp-vccf-f47h](https://github.com/advisories/GHSA-6qxp-vccf-f47h) | @modelcontextprotocol/sdk 1.30.0 | high | `>=1.12.0 <1.31.0` | 1.31.0 | F |
| [GHSA-vh66-26gq-q6x8](https://github.com/advisories/GHSA-vh66-26gq-q6x8) | axios 1.18.1 | moderate | `>=1.7.0 <1.20.0` | 1.20.0 | G |
| [GHSA-9fr6-4gfg-395g](https://github.com/advisories/GHSA-9fr6-4gfg-395g) | axios 1.18.1 | moderate | `>=1.0.0 <1.20.0` | 0.34.0, 1.20.0 | G |
| [GHSA-c29m-xwm3-cm6r](https://github.com/advisories/GHSA-c29m-xwm3-cm6r) | axios 1.18.1 | high | `>=1.16.1 <1.20.0` | 1.20.0 | G |
| [GHSA-mghh-pgcx-3jjj](https://github.com/advisories/GHSA-mghh-pgcx-3jjj) | axios 1.18.1 | high | `>=1.15.0 <1.20.0` | 1.20.0 | G |
| [GHSA-x97p-jq2g-jp4f](https://github.com/advisories/GHSA-x97p-jq2g-jp4f) | axios 1.18.1 | high | `>=1.15.1 <1.20.0` | 0.34.0, 1.20.0 | G |
| [GHSA-3pq3-5fj3-cg6v](https://github.com/advisories/GHSA-3pq3-5fj3-cg6v) | axios 1.18.1 | high | `>=1.13.0 <1.20.0` | 1.20.0 | G |
| [GHSA-542g-h47m-68v8](https://github.com/advisories/GHSA-542g-h47m-68v8) | axios 1.18.1 | high | `>=1.13.0 <1.20.0` | 1.20.0 | G |
| [GHSA-j8rh-479h-cp32](https://github.com/advisories/GHSA-j8rh-479h-cp32) | axios 1.18.1 | moderate | `>=1.0.0 <1.20.0` | 1.20.0 | G |
| [GHSA-4hqw-qxg8-jxx2](https://github.com/advisories/GHSA-4hqw-qxg8-jxx2) | axios 1.18.1 | moderate | `>=1.12.0 <1.20.0` | 1.20.0 | G |
| [GHSA-m8m8-qj5v-23w3](https://github.com/advisories/GHSA-m8m8-qj5v-23w3) | axios 1.18.1 | high | `>=1.15.2 <1.20.0` | 1.20.0 | G |
| [GHSA-44g4-m2mj-wpvx](https://github.com/advisories/GHSA-44g4-m2mj-wpvx) | axios 1.18.1 | moderate | `>=1.15.0 <1.20.0` | 1.20.0 | G |
| [GHSA-r4gj-5m52-g5wh](https://github.com/advisories/GHSA-r4gj-5m52-g5wh) | axios 1.18.1 | high | `>=1.17.0 <1.20.0` | 1.20.0 | G |
| [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | brace-expansion 5.0.9 | moderate | `>=4.0.0 <5.0.12` | 5.0.12, 3.0.9, 2.1.7, 1.1.21 | H |
| [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | brace-expansion 5.0.9 | high | `>=4.0.0 <5.0.11` | 5.0.11, 3.0.8, 2.1.6, 1.1.20 | H |
| [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | brace-expansion 5.0.9 | high | `>=4.0.0 <5.0.10` | 5.0.10, 3.0.7, 2.1.5, 1.1.19 | H |
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | braces 3.0.3 | high | `<=3.0.3` | None listed | H |
| [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) | deepmerge-ts 7.1.5 | high | `<8.0.0` | 8.0.0 | D |
| [GHSA-r3ph-w7gj-g6xm](https://github.com/advisories/GHSA-r3ph-w7gj-g6xm) | js-yaml 3.15.2, 5.3.0 | moderate | `>=5.0.0 <=5.4.0` | 5.4.1 | C |
| [GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc) | lodash 4.17.21 | high | `>=4.0.0 <=4.17.23` | 4.18.0 | B |
| [GHSA-f23m-r3pf-42rh](https://github.com/advisories/GHSA-f23m-r3pf-42rh) | lodash 4.17.21 | moderate | `<=4.17.23` | 4.18.0 | B |
| [GHSA-xxjr-mmjv-4gpg](https://github.com/advisories/GHSA-xxjr-mmjv-4gpg) | lodash 4.17.21 | moderate | `>=4.0.0 <=4.17.22` | 4.17.23 | B |
| [GHSA-3f6p-5ww8-9rcr](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr) | mysql2 3.15.3 | high | `<3.22.0` | 3.22.0 | D |
| [GHSA-rgwj-5xj2-c3m3](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3) | mysql2 3.15.3 | moderate | `<=3.23.0` | 3.23.1 | D |
| [GHSA-67c8-pqhq-4rmx](https://github.com/advisories/GHSA-67c8-pqhq-4rmx) | piscina 5.2.0 | critical | `>=5.0.0 <5.3.2` | 5.3.2, 4.9.4, 6.0.0-rc.5 | E |
| [GHSA-7w5x-hrqm-74c2](https://github.com/advisories/GHSA-7w5x-hrqm-74c2) | smol-toml 1.6.1 | high | `<=1.7.0` | 1.7.1 | H |
| [GHSA-r4xh-jqrq-34v2](https://github.com/advisories/GHSA-r4xh-jqrq-34v2) | smol-toml 1.6.1 | moderate | `<=1.8.0` | 1.9.0 | H |
| [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) | sprintf-js 1.0.3 | moderate | `<=1.1.3` | None listed | I |
| [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | uuid 8.3.2 | moderate | `<11.1.1` | 12.0.1, 13.0.1, 11.1.1 | J |

### Installed affected package entries, including inherited findings

This records every package entry counted by the full audit. Direct dependency category is taken from package.json; transitive entries can serve more than one parent. The advisory table and reachability groups explain inherited findings.

| Package | Installed version(s) | Direct category | Audit severity | Immediate finding sources |
| --- | --- | --- | --- | --- |
| @analogjs/vite-plugin-angular | 2.6.4 | devDependencies | high | ts-morph |
| @angular/build | 22.1.9 | devDependencies | critical | piscina |
| @angular/cli | 22.1.9 | devDependencies | high | @modelcontextprotocol/sdk |
| @angular/router | 22.1.8 | dependencies | high | GHSA-ff3f-86qr-9cv3 |
| @istanbuljs/load-nyc-config | 1.1.0 | Transitive | moderate | js-yaml |
| @jest/expect | 30.5.2 | Transitive | moderate | jest-snapshot |
| @jest/globals | 30.5.2 | Transitive | moderate | @jest/expect |
| @jest/reporters | 30.5.2 | Transitive | moderate | @jest/transform |
| @jest/transform | 30.5.2 | Transitive | moderate | babel-plugin-istanbul |
| @modelcontextprotocol/sdk | 1.30.0 | Transitive | high | GHSA-6qxp-vccf-f47h |
| @nestjs/config | 4.0.2 | dependencies | moderate | lodash |
| @nestjs/swagger | 11.4.7 | dependencies | moderate | js-yaml |
| @nx/angular | 23.2.1 | devDependencies | high | @nx/eslint, @nx/js, @nx/playwright, @nx/web, @nx/webpack |
| @nx/eslint | 23.2.1 | devDependencies | high | @nx/jest, @nx/js |
| @nx/eslint-plugin | 23.2.1 | devDependencies | high | @nx/js |
| @nx/jest | 23.2.1 | Transitive | high | @jest/reporters, @nx/js, jest-config |
| @nx/js | 23.2.1 | devDependencies | high | @nx/workspace |
| @nx/nest | 23.2.1 | devDependencies | high | @nx/eslint, @nx/js, @nx/node |
| @nx/node | 23.2.1 | devDependencies | high | @nx/eslint, @nx/jest, @nx/js |
| @nx/playwright | 23.2.1 | devDependencies | high | @nx/eslint, @nx/js |
| @nx/vite | 23.2.1 | devDependencies | high | @nx/js, @nx/vitest |
| @nx/vitest | 23.2.1 | devDependencies | high | @nx/eslint, @nx/js |
| @nx/web | 23.2.1 | devDependencies | high | @nx/eslint, @nx/jest, @nx/js, @nx/playwright, @nx/vite, @nx/webpack |
| @nx/webpack | 23.2.1 | devDependencies | high | @nx/js, webpack-dev-server |
| @nx/workspace | 23.2.1 | Transitive | high | nx |
| @prisma/config | 7.10.0 | Transitive | high | deepmerge-ts |
| @ts-morph/common | 0.22.0 | Transitive | high | fast-glob |
| argparse | 1.0.10 | Transitive | moderate | sprintf-js |
| axios | 1.18.1 | Transitive | high | GHSA-vh66-26gq-q6x8, GHSA-9fr6-4gfg-395g, GHSA-c29m-xwm3-cm6r, GHSA-mghh-pgcx-3jjj, GHSA-x97p-jq2g-jp4f, GHSA-3pq3-5fj3-cg6v, GHSA-542g-h47m-68v8, GHSA-j8rh-479h-cp32, GHSA-4hqw-qxg8-jxx2, GHSA-m8m8-qj5v-23w3, GHSA-44g4-m2mj-wpvx, GHSA-r4gj-5m52-g5wh |
| babel-jest | 30.5.2 | Transitive | moderate | @jest/transform, babel-plugin-istanbul |
| babel-plugin-istanbul | 8.0.0 | Transitive | moderate | @istanbuljs/load-nyc-config |
| brace-expansion | 5.0.9 | Transitive | high | GHSA-q2hr-2g5m-vwhr, GHSA-qhr7-859c-m2p7, GHSA-6j4f-fj2g-mc7p |
| braces | 3.0.3 | Transitive | high | GHSA-vfj7-8cjw-p6xm |
| chokidar | 3.6.0 | Transitive | high | braces |
| deepmerge-ts | 7.1.5 | Transitive | high | GHSA-ggr8-5vv4-36mx |
| fast-glob | 3.3.3 | Transitive | high | micromatch |
| http-proxy-middleware | 2.0.10 | Transitive | high | micromatch |
| jest-circus | 30.5.2 | Transitive | moderate | @jest/expect, jest-runtime, jest-snapshot |
| jest-config | 30.5.2 | Transitive | moderate | babel-jest, jest-circus, jest-runner |
| jest-runner | 30.5.2 | Transitive | moderate | @jest/transform, jest-runtime |
| jest-runtime | 30.5.2 | Transitive | moderate | @jest/globals, @jest/transform, jest-snapshot |
| jest-snapshot | 30.5.2 | Transitive | moderate | @jest/transform |
| js-yaml | 3.15.2, 5.3.0 | Transitive | moderate | GHSA-r3ph-w7gj-g6xm, argparse |
| lodash | 4.17.21 | Transitive | high | GHSA-r5fr-rjxr-66jc, GHSA-f23m-r3pf-42rh, GHSA-xxjr-mmjv-4gpg |
| micromatch | 4.0.8 | Transitive | high | braces |
| mysql2 | 3.15.3 | Transitive | high | GHSA-3f6p-5ww8-9rcr, GHSA-rgwj-5xj2-c3m3 |
| nx | 23.2.1 | devDependencies | high | axios, brace-expansion, smol-toml |
| piscina | 5.2.0 | Transitive | critical | GHSA-67c8-pqhq-4rmx |
| prisma | 7.10.0 | devDependencies | high | @prisma/config, mysql2 |
| smol-toml | 1.6.1 | Transitive | high | GHSA-7w5x-hrqm-74c2, GHSA-r4xh-jqrq-34v2 |
| sockjs | 0.3.24 | Transitive | moderate | uuid |
| sprintf-js | 1.0.3 | Transitive | moderate | GHSA-hp3w-g68c-fv3c |
| ts-morph | 21.0.1 | Transitive | high | @ts-morph/common |
| uuid | 8.3.2 | Transitive | moderate | GHSA-w5hq-g745-h8pq |
| webpack-dev-server | 5.2.6 | devDependencies | high | chokidar, http-proxy-middleware, sockjs |

## Authorized remediation record — 2026-10-14

The owner replied "ok ale najpierw uzyj nx migrate latest" to the concrete proposal.
`npm exec nx migrate latest` ran first and aligned Nx/direct @nx packages on
23.3.0. There were no applicable migrations and no migrations.json was generated.
Angular runtime/compiler/CLI/build/devkit/schematics are now 22.2.2; Material/CDK
remain 22.2.1. Both Analog packages are 2.8.0 and Nest Config is 4.0.4. Prisma
CLI/client/adapter remain 7.10.0. Generated-client ngVersion is 22.2.2; official
regeneration produced no TypeScript/public contract changes.

The Swagger js-yaml patch is scoped to `@nestjs/swagger@11.4.7` and pins 5.4.1.
The version-qualified parent key is necessary because Nx 23.3 drops overrides
whose bare keys are also generated direct dependencies; losing this nested
override would make the output manifest inconsistent with its lockfile. The
qualified key survives generated output and a clean artifact `npm ci` succeeded.
This is dependency metadata, not a manual generated-client change.

Nx 23.3 pins undici 7.29.0, introducing ten additional advisories in the intermediate
tree. A parent-scoped Nx override updates that dependency to patched 7.29.1. Its
engine supports the running Node 24.16.0 and project-pinned 24.19.0. No global
Undici override or Node runtime upgrade was introduced. The records below describe
the relevant conditions; all ten are removed from the final registry report.

The first npm install could not reconcile old lockfile peer decisions and selected
an incompatible Angular devkit 21 peer. Resolution from the approved manifest in
an isolated empty directory succeeded without force/legacy-peer-deps. The generated
lockfile refreshes the transitive tree (241 existing-path versions changed during
initial resolution); no extra direct dependency was added. The root installation
ran normal lifecycle scripts; isolated reproduction disables them. npm ls reports
no invalid direct peers. Package range/lockfile updates are broader than the direct
version edits and remain available for review.

### Advisory outcomes

Of the 30 baseline advisories, 24 no longer appear in the final audit. Angular
router, Piscina, MCP SDK, all 12 Axios findings, all three brace-expansion findings,
both smol-toml findings, all three lodash findings and js-yaml are fixed or removed
from the resolved dependency tree. No scanner suppressions were used.

Six baseline advisories remain, with these explicit proposed exceptions. They are
not fixed; exception acceptance remains with the owner. Reassess them before public
release and when their parent packages publish compatible updates.

| Remaining advisory | Current package | Disposition and follow-up |
| --- | --- | --- |
| GHSA-vfj7-8cjw-p6xm | braces 3.0.3 | Deferred tooling finding: no patch listed; watch/proxy/glob chains remain through Nx/webpack/Jest tooling. No arbitrary glob endpoint exists in Daylo. Reassess with parent updates and exposed dev-server configurations. |
| GHSA-ggr8-5vv4-36mx | deepmerge-ts 7.1.5 | Deferred Prisma CLI configuration finding; recursive untrusted config path not found. Fixed version is major 8 and Prisma 7.10.0 still uses 7.x. Reassess a supported Prisma update; no arbitrary major override. |
| GHSA-3f6p-5ww8-9rcr | mysql2 3.15.3 | MySQL path inapplicable to current PostgreSQL configuration; vulnerable CLI dependency retained. Reassess if MySQL tooling/adapter or Prisma parent changes. |
| GHSA-rgwj-5xj2-c3m3 | mysql2 3.15.3 | Compressed MySQL connection inapplicable; same parent follow-up. PostgreSQL adapter and runtime artifact do not use this package. |
| GHSA-hp3w-g68c-fv3c | sprintf-js 1.0.3 | Deferred coverage/Jest argparse tooling finding; no patch listed, no user-controlled format path found. Reassess with parent updates rather than unrelated major changes. |
| GHSA-w5hq-g745-h8pq | uuid 8.3.2 | SockJS's inspected v4 call does not meet affected v3/v5/v6 buffer conditions. Deferred unsupported old package; reassess parent update, without injecting a uuid major. |

Final full-workspace report: 36 affected package entries, 12 high and 24 moderate,
zero critical, representing those six unique advisories. The final omit-dev report
has four high entries through Prisma/config/deepmerge/MySQL. These classifications
do not make the CLI dependencies part of the compiled API. Fresh generated API
artifact audit has zero findings, with a separately successful clean production
installation of its manifest and lockfile (159 installed packages).

### Additional Undici advisories addressed during migration

These are development dependencies through Nx and absent from the API artifact.
The official records were read through GitHub's advisory API on 2026-10-14. Each
has fixed version 7.29.1 in the selected line; npm's final report contains none.
Their removal does not establish that Node's separately bundled Undici is patched
or that every external agent host is unaffected.

| Advisory | Relevant prerequisite | Outcome |
| --- | --- | --- |
| [GHSA-3wwx-pv8p-q78v](https://github.com/advisories/GHSA-3wwx-pv8p-q78v) | WebSocket peer sends malformed compressed messages beyond the size cap | Fixed npm dependency 7.29.1 |
| [GHSA-pmjh-fq2x-6v4x](https://github.com/advisories/GHSA-pmjh-fq2x-6v4x) | RetryHandler body after truncated/retried upstream response | Fixed npm dependency 7.29.1 |
| [GHSA-r53p-7pc4-xj5r](https://github.com/advisories/GHSA-r53p-7pc4-xj5r) | Retry interceptor plus downstream forwarding of resumed body/headers | Fixed npm dependency 7.29.1 |
| [GHSA-rfgv-xxqx-mfg5](https://github.com/advisories/GHSA-rfgv-xxqx-mfg5) | WebSocket server returns an unrequested subprotocol | Fixed npm dependency 7.29.1 |
| [GHSA-3xpg-4rpp-hhhm](https://github.com/advisories/GHSA-3xpg-4rpp-hhhm) | Decompression interceptor processes hostile compressed upstream bodies | Fixed npm dependency 7.29.1 |
| [GHSA-2jfj-6hjv-fm6j](https://github.com/advisories/GHSA-2jfj-6hjv-fm6j) | Shared cache stores/replays Set-Cookie responses across callers | Fixed npm dependency 7.29.1 |
| [GHSA-2gqq-gqf2-x968](https://github.com/advisories/GHSA-2gqq-gqf2-x968) | Dump interceptor reads oversized chunked responses | Fixed npm dependency 7.29.1 |
| [GHSA-w293-vg96-wgc3](https://github.com/advisories/GHSA-w293-vg96-wgc3) | BalancedPool has function-valued custom TLS/connect options | Fixed npm dependency 7.29.1 |
| [GHSA-8436-99hf-9mmv](https://github.com/advisories/GHSA-8436-99hf-9mmv) | Cache interceptor receives unsafe HTTP-method responses | Fixed npm dependency 7.29.1 |
| [GHSA-rx4f-c7p8-82vq](https://github.com/advisories/GHSA-rx4f-c7p8-82vq) | WebSocketStream has unclean close while a writer lock is held | Fixed npm dependency 7.29.1 |

### Packaging and tooling limits

The existing `api:prune` target fails: both @nx/js executors require a source
`apps/api/package.json` which this integrated app does not have. No passing prior
baseline for that target was established, so this is not attributed to the upgrade.
The normal webpack build independently generates its runtime manifest/lockfile;
that output installs and audits cleanly. The prune target is not claimed to pass.
Repairing its packaging strategy remains a separate discussion, not an invented
source manifest with duplicated dependencies or a speculative deployment change.

Nx 23.3 warns that explicit Vitest executors and Vite path/assets plugins will be
removed in Nx 24. They remain functional here. Their future conversion is deferred;
no unrequested generators or code modernization were run. Monthly advisory-review
ownership/automation remains a proposal, not an enabled CI gate.

### Verification and delivery limits

- Workspace clean install of the final manifest/lockfile and direct peer check
  passed without force or legacy peer handling. Lifecycle-enabled root install
  passed; the independent temporary reproduction uses `--ignore-scripts`.
- All 22 Nx lint targets passed. All 12 available test targets passed, including
  221 API tests with PostgreSQL enabled, 28 configuration cases, 16 auth repository
  cases (13 cleanup), 10 security-event cases and the frontend/schema/client tests.
  Database transactions were additionally enabled in their target: 12 cases passed.
  Across the final project suites there are 357 distinct passing tests. The first
  all-project run skipped those four database transaction cases; the focused run
  supplied their missing opt-in rather than rerunning every suite.
- Three committed Prisma migrations applied to each of three empty disposable
  PostgreSQL 17 databases; schema-constraint verification passed. Cleanup used its
  own database, separate from auth regression and the UI database.
- API and web production builds, generated-client compilation, offline OpenAPI
  validation and deterministic source-preserving client drift checks passed.
  Regeneration uses the official generator; tracked contract/client output is
  unchanged. No migration or application behavior was added.
- Clean production install of the freshly generated API manifest/lockfile passed
  and its audit has zero findings. `api:prune` failed as described above and is not
  included in successful packaging claims.
- Real-stack desktop/mobile Playwright: 22 passed, actual frontend/API/PostgreSQL,
  with real access/session/CSRF/quota enforcement and synthetic fixtures. The first
  attempt failed with connection refusal because the external-stack URL disables
  automatic frontend startup. After explicit `web:serve` and readiness checks for
  both UI and proxied API, the complete rerun passed once in three minutes.
- Independent browser inspection observed Angular 22.2.2, dark desktop 1280 x 800
  and light mobile 390 x 844 layouts, safe invalid-callback recovery, protected
  anonymous entry, durable expiry notice after reload and empty browser storage.
  No overflow or unexpected Daylo console/network error was observed; the protected
  anonymous session request correctly returned 401. Keyboard action focused the
  Google link, but this browser session reported `:focus-visible=false`/no outline.
  Independent focus-ring reproduction is therefore incomplete; the Playwright
  keyboard/solid-outline assertions passed in both projects. No CSS was changed
  to accommodate the browser tool. Authenticated/pending actions were covered in
  E2E, not independently signed in through this browser.

Real Google sign-in/PKCE, hosted CI, deployment, a physical phone and production
load were not verified. Owner acceptance of the delivered updates, six residual
exceptions and packaging/browser limits remains pending. No commit, push, PR or
subsequent task was performed.

Owned API/frontend process trees and the disposable PostgreSQL container/volume
were stopped/removed after verification. Automatic command review rejected recursive
removal of the three explicitly checked temporary installation directories with
"blocked by policy". `daylo-f06-12-resolution`, `daylo-f06-12-clean-install` and
`daylo-f06-12-artifact-install` remain under the operating-system temporary directory,
outside version control. Raw review reports remain there for evidence as intended.

Retrospective: verify stack readiness before opt-in E2E; inspect generated manifests
as well as audit counts because dependency overrides can be dropped during pruning;
re-audit immediately after Nx migration to catch newly introduced transitive findings.

### Owner acceptance — 2026-10-14

The owner accepted the reported delivery and limits with "akcceptuje, mozna pr
zrobic" and separately authorized its task-branch commit, push and draft PR. This
closes F06-12 without claiming deferred advisories are patched or incomplete checks
passed. Prior pending-acceptance statements describe the delivery stage and are
superseded by this record. Recurring-review automation, packaging repairs, merge,
deployment and subsequent implementation remain outside this authorization.
