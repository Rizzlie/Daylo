# Daylo — MVP Requirements

Status: Planning baseline, version 1.0.

## 1. Product purpose

Daylo is a personal and shared task planner with Today as its primary screen.

The project also provides practical experience with agentic coding: defining requirements, delegating bounded tasks, reviewing changes, and verifying behavior. The developer acts as the product owner and reviewer.

The first user is the application owner. A second person joins once the basic functionality is stable.

## 2. Scope and constraints

- Angular frontend and NestJS backend in an Nx workspace.
- PostgreSQL persistence through Prisma.
- Google OAuth as the only sign-in method.
- Responsive desktop and mobile interface.
- Angular Material as the frontend component library, with a custom Daylo theme.
- Local execution for the first release; an internet connection is required for Google sign-in.
- English code, identifiers, filenames, comments, API contracts, and documentation.
- Polish user-facing UI text.
- Initial application timezone: `Europe/Warsaw`.

Google Calendar integration, system notifications, automatic overdue task rollover, weekly planning, priorities, and PWA installation are deferred to subsequent releases.

## 3. Authentication and access

- The application owner's Google email is configured as the initial allowed account.
- Only the application owner can create groups and manage invitations in the MVP.
- The owner invites another person by their Google email.
- A matching pending invitation permits Google sign-in to a restricted invitation screen.
- The invited person must explicitly accept or reject the invitation.
- Before acceptance, the invited person cannot access group tasks or create personal tasks.
- Accepting the first invitation activates normal application access and creates group membership.
- Uninvited accounts cannot access application data.
- Invitations are handled inside the application; no invitation emails are sent.
- Users can sign out.

Personal tasks remain private even when their owner belongs to a group.

## 4. Task behavior

Each task contains:

- A required title.
- A required scheduled date, defaulting to today.
- An optional scheduled time.
- An optional description.
- Personal or group visibility.
- Completion status.

Users can create, edit, delete, complete, and reopen accessible tasks.

All members can edit and complete their group's tasks. Completion is shared: completing a task in one member's session updates the other member's view without a manual page refresh. Reopening a task also updates all members.

Task time represents a point in the day, not a duration or a reserved time block.

### Initial defaults

- Group tasks are unassigned.
- Visibility is selected during creation and cannot be changed in the MVP.
- Quick creation defaults to a personal task; the user can select a group.
- Date defaults to today; time and description remain optional.
- A failed save keeps the entered form values and provides a retry path.
- Deletion requires confirmation.

## 5. Today screen

The primary screen contains:

- A personalized greeting, for example `Cześć, Maciej!`.
- An optional playful suffix, for example `Slay queen`.
- Quick task creation.
- A timeline of unfinished tasks scheduled for today with a time.
- A list of unfinished tasks scheduled for today without a time.
- A separate overdue section.
- A collapsible completed section.

Show the user's personal tasks and tasks from all their groups.

### Ordering and grouping

- Timed tasks: scheduled time ascending, then creation time ascending.
- Untimed tasks: creation time ascending.
- Overdue tasks: scheduled date ascending, then scheduled time and creation time; untimed tasks follow timed tasks on the same date.
- Completed section: currently completed tasks scheduled for today or completed today, without duplicates; most recently completed first.
- Overdue tasks retain their original scheduled date. No automatic rollover occurs in this release.
- Reevaluate Today on local midnight and when the application returns to the foreground.

An empty state offers task creation. Loading, authentication failure, request failure, and lost shared-update connection have explicit UI states.

## 6. Interface

Use a minimalist design with two themes:

Use Angular Material components for standard controls. Review the Today mockups before implementing feature screens. See [Today design brief](design-brief.md).

| Theme | Background | Accent |
| --- | --- | --- |
| Dark | Dark gray | Red-orange |
| Light | Very light orange | Red-orange |

- Follow the operating system theme by default.
- Offer a manual theme selection and save the preference.
- Allow playful greeting suffixes to be disabled; enable them by default.
- Mobile navigation appears at the bottom with `Dzisiaj`, `Grupy`, and `Ustawienia` destinations.
- The accepted Today visual baseline is documented in [Design sources](design/README.md): logo, collapsible desktop sidebar, bottom-anchored desktop settings and avatar, rounded main content card, and `Do zrobienia` for untimed tasks. Exact tokens and responsive details remain to be refined.
- Forms, dialogs, and task actions remain usable on small screens and with a keyboard.
- Use accessible labels and adequate text contrast in both themes.

The Group screen lists groups, members, and pending invitations; owner-only controls create groups and invitations. Settings contains appearance, greeting preferences, and sign-out.

## 7. Acceptance criteria

- The configured owner can sign in using Google.
- An uninvited account cannot access personal or group data.
- An invited person can accept or reject their invitation.
- Group data remains inaccessible until acceptance.
- Personal tasks remain private through both UI and direct API requests.
- Tasks can be created, edited, deleted, completed, and reopened.
- Data persists after page reload, sign-out, and application restart.
- Shared completion and reopening update a second member's session without refreshing it.
- Timeline, untimed, overdue, and completed sections contain the correct tasks.
- Day boundaries are interpreted in `Europe/Warsaw`.
- Both themes, preference persistence, mobile navigation, and task forms work.
- Relevant tests, lint, production builds, frontend E2E tests, and agent browser verification pass.

The MVP acceptance exercise is to plan personal and shared tasks and use Daylo for seven days. That real-use exercise is separate from automated verification.
