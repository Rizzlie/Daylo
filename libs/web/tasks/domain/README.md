# web-tasks-domain

Framework-independent Today task models and `groupTodayTasks(tasks, date, timeZone)`.
Use the reference date and timezone returned together by the Today API; grouping
never reads the browser clock. The projection deduplicates IDs, excludes future
unfinished tasks, preserves overdue dates and derives counts from its four sections.
Time/creation ordering uses ID ascending for final ties; completed tasks sort by
completion instant descending, then ID ascending. Inputs are not mutated.

## Running unit tests

Run `npm exec nx run web-tasks-domain:test` through the workspace's Vitest target.
