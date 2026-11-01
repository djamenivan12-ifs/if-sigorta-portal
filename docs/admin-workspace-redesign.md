# Admin workspace redesign — 2026-11-01

## Scope

Admin-only navigation groups and overview styled after the approved navy/lime/light-blue mockup. Existing agents and partners retain their dashboard and navigation. All existing admin destinations remain accessible. The original operational dashboard, analyses and monthly reports remain at `/admin/dashboard?view=analysis`.

Counters and their filter lists use the same existing dashboard model. The date selector applies to newly created requests, not outstanding queues. Workload counts assigned requests requiring internal action (`payment_review`, `payment_confirmed`, `policy_preparation`); waiting on the client, completed and cancelled requests are excluded. Admin assignments are identified explicitly. Missing directory entries and failed optional reads are shown rather than silently interpreted as zero. Dossier links retain the existing assignment and payment workflows; this change creates no new write endpoints.

## Rollback

- Baseline commit: `e9565e6b2c9df4c9d532609727adb5bd86786a41`.
- Remote preserved branch: `backup/admin-before-redesign-2026-11-01`.
- Baseline production deployment: `dpl_BDL7K7BC12tPJUxy8uee1UPSv9fD`.
- Preferred rollback: revert the isolated redesign merge commit on `develop` and let the existing Vercel integration deploy it. This preserves subsequent unrelated changes. Do not reset the branch or restore a database snapshot.
- No database migration, data mutation, price or messaging configuration change is involved.

## Verification

`npm run check` includes dedicated overview tests for queue/date consistency, workload exclusions, unavailable data and authorization/minimal serialization. The standard local Turbopack production build passes after copying dependencies into the isolated worktree. An initial webpack attempt encountered pre-existing page-prop validator differences; webpack was not used for the release. Desktop and 390-pixel mobile browser visual inspection uses static server-rendered actual components and synthetic fixtures, since the preview daemon cannot launch this Next.js checkout. This is visual QA only, not an authenticated end-to-end test.
