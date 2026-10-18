# F07-03 — Parallel real-stack E2E checks

Parent backlog item: **F07** · [Task index](../tasks.md) · [Backlog](../backlog.md)

Discussion status: Scope agreed on 2026-10-18.
Implementation authorization: Granted on 2026-10-18: "Ok, merged to main, you can switch and create PR".
Delivery status: Implemented and locally verified on 2026-10-18; hosted timing and owner acceptance pending.

## Assumptions and scope

- PR #30 is merged. The owner agreed to a separate PR optimizing the complete
  mandatory E2E suite through parallel jobs with isolated API/PostgreSQL stacks.
- Preserve all 62 current desktop/mobile scenarios, production rate limits,
  Google-only provider replacement, affected-project selection and cleanup.
- Use four native Playwright shards, one worker and one managed stack per job.
  No application code, dependencies, authentication shortcuts or Nx Cloud setup.
- Keep the existing `Real-stack E2E` check as an aggregate gate. All shards must
  succeed; a failing shard must not cancel its siblings. Keep separate reports
  and traces for each shard using unique artifact names.

## Acceptance criteria

- The four shard selections together contain every unsharded test exactly once.
- All four isolated real-stack runs pass; no temporary stacks remain afterward.
- A shard failure makes the aggregate check fail. Existing PR/main selection and
  report retention remain intact, including artifacts from failed shards.
- Record measured durations against the previous serial baseline, separating
  local evidence from hosted CI and runner setup time. Do not promise a speedup
  based only on dividing the serial duration by four.

## Approach and verification

- Extend the existing GitHub Actions E2E job to a four-entry matrix forwarding
  `--shard=n/4` through the existing Nx `e2e-fullstack` target. Each runner owns
  its checkout, Docker daemon and already isolated managed environment.
- Verify native test collection across all shards and the unsharded suite.
- Build required outputs once before local parallel verification, then run shards
  without task dependencies and with distinct artifact paths/reporters. This
  avoids concurrent Prisma/build writers and shared Playwright report cleanup.
- Parse workflow YAML, check relevant lint/typechecks, inspect aggregate failure
  handling and run the complete partitioned suite. UI/browser review is N/A:
  this task changes execution of existing browser acceptance scenarios only.
- Publish a separate draft PR using the repository template and compare hosted
  timing when its checks finish. Leave unrelated local `nx.json` work untouched.

## Baseline and delivery record

- Hosted baseline: [run 39159619401](https://github.com/Rizzlie/Daylo/actions/runs/39159619401),
  commit `efdeccd`, successful `Real-stack E2E` job from 19:38:01 to 20:00:40 UTC
  on 2026-10-18: **22 min 39 s**, including setup/builds and the serial suite.
- Earlier local initial serial run: **18 min 51 s**, 56 passed and six failed
  before quota-wait corrections; it is not a successful performance baseline.
- Coverage: native Playwright collection selected **62 tests** unsharded and
  **17 / 15 / 16 / 14** across shards 1–4. Comparing test IDs and browser projects
  confirmed the same union, with **zero missing tests and zero duplicates**.
- Workflow YAML parses. Structural checks confirm both PR/main shard forwarding,
  unique report names, independent sibling execution and the stable aggregate
  dependency/gate. Existing E2E lint/typecheck and build prerequisites pass.
- Executing the aggregate's actual shell command returned 0 for `success` and
  1 for `failure`, `cancelled` and `skipped`; non-success cannot pass the gate.
- Local execution: **all 62 tests passed**, none skipped, across four simultaneous
  owned stacks with distinct PostgreSQL ports and private output directories.
  Shards 1–4 took **5:47 / 5:20 / 5:24 / 4:58** respectively, including Nx startup,
  stack provisioning, tests and cleanup. Wall time from earliest start to last
  completion was **5 min 47 s**. Required application builds were completed once
  before these parallel runs; npm/browser installation is excluded. This is not
  directly comparable to the hosted job baseline including all setup.
- All four runtime cleanup manifests reported completion and no labeled E2E
  container remained. Collection stacks were also cleaned up. No application,
  API contract, dependency, rate-limit, worker-count or test-assertion changes.
- Hosted comparison will use the matrix start through aggregate completion,
  including job setup/builds. Results remain pending the new PR's check run;
  publication uses the existing thread attachment and links this task in the PR.
- Owner acceptance: Pending.

## Discussion and retrospective

- The owner requested full mandatory E2E optimization after PR #30 passed;
  reducing coverage to the login smoke test is outside the agreed scope.
- Preserve isolated runtime budgets rather than increasing workers against a
  shared API. Keep verification runs from competing for generated outputs.
- Native sharding selected 17/15/16/14 cases; measured durations were similar
  enough to keep the standard partitioner rather than adding manual file groups.
- Local Windows/Node 24.16.0 results do not certify Ubuntu/pinned Node 24.19.0
  performance. Four CI runners consume parallel capacity and repeat setup/build
  work. Reports remain separate per shard; report merging is outside this slice.
