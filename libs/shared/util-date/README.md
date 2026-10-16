# Shared date utilities

`todayInTimeZone(timeZone, now?)` returns a calendar date as `YYYY-MM-DD` in the
supplied IANA time zone. It has no installation default and does not read the
process or browser environment. API and web use the same implementation.

Run `npm exec nx -- run shared-util-date:test` from the workspace root.
