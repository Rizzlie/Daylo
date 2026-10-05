# Daylo — Today Design Brief

Status: Visual baseline accepted by the owner on 2026-10-05. Application implementation remains pending and requires a requested backlog item.

The accepted source is the owner's export under `design/`, documented in `design/README.md`. It supersedes the earlier Figma draft. `design-revision-02.md` remains historical context for requested changes; the blocked Figma edits are no longer the active design workflow.

The normalized implementation specification is [Design system](design/design-system.md), with exact values in [tokens.json](design/tokens.json). It resolves conflicting export values while preserving the accepted direction. Rendered theme and responsive verification remain pending.

## 1. Goal

Review the Today screen's information hierarchy, daily interactions, and visual identity before implementing it. Angular Material is the approved component library.

Create one initial design direction in light and dark themes at desktop and mobile widths. These are four views of the same design, not four unrelated designs.

The mockup uses synthetic tasks and a fictional day. It does not imply a working backend, Google login, or cross-user synchronization.

## 2. Mockup format and workflow

1. Start with a wireframe to review the order of sections and task creation flow.
2. Use the accepted exported mockups and HTML as visual references. They are not an Angular Material implementation.
3. Review both themes and desktop/mobile layouts using the same sample data.
4. Refine the approved design and record colors, typography, spacing, component choices, and responsive behavior in a design system document.
5. Implement the accepted design using actual Angular Material components in the Nx application after the relevant backlog task is requested.

Keep visual prototypes separate from production application source. Browser testing of prototypes checks their interaction and layout; application E2E remains a separate implementation requirement.

## 3. Initial layout proposal

### Desktop

- Left navigation: logo and Daylo identity, Today, and Groups; Settings and the user avatar at the bottom. Include expanded and collapsed states, a subtle border, and a light shadow.
- Main header: today's date, a personalized greeting, and an optional playful suffix.
- Quick creation inside the rounded main content card below the header; task sections share this card.
- Primary column: chronological timeline with point-in-time tasks.
- Secondary column: untimed tasks and an overdue section.
- Completed tasks remain collapsed until opened.

### Mobile

- One content column with the same sections and task behavior.
- Greeting and date at the top.
- Quick creation before the task sections.
- Timeline, untimed tasks, overdue tasks, and collapsed completed tasks.
- Bottom navigation with `Dzisiaj`, `Grupy`, and `Ustawienia`, a subtle top border, and a light shadow.
- Account for device safe areas so navigation does not cover the final task or form actions.

These placements and the exported visual direction are accepted as the baseline. Exact tokens, narrow-screen geometry, and missing interaction/error states still require refinement.

## 4. Interaction scope

The first interactive mockup should allow:

- Completing and reopening tasks, with a visible change between active and completed sections.
- Entering a title through quick creation; today's date is the default.
- Revealing optional date, time, description, and personal/group selection.
- Opening task details and editing the synthetic task.
- Expanding and collapsing completed tasks.
- Switching between light and dark views and inspecting mobile layout.

Navigation destinations beyond Today are outside this mockup. Show their labels without pretending those screens are implemented.

## 5. Angular Material mapping

| UI element | Intended implementation |
| --- | --- |
| Desktop navigation | Sidenav and navigation list |
| Header and mobile navigation actions | Toolbar, buttons, and icons arranged in an application-specific layout |
| Completion control | Checkbox |
| Task input and optional description | Form fields and inputs |
| Scheduled date | Datepicker |
| Optional time | A validated time input inside a form field |
| Personal/group selection | Select |
| Task details and delete confirmation | Dialog |
| Secondary task actions | Menu |
| Collapsed completed section | Expansion panel |
| Save failure or completion feedback | Inline messages and snackbar where appropriate |
| Point-based timeline | Semantic application-specific layout with Material task controls |

Do not assume that Angular Material provides a point-based timeline or a dedicated mobile bottom-navigation component. Compose those layouts using its existing controls.

## 6. Visual direction

- Minimalist, compact task rows rather than one large card per task.
- Dark theme: gray background and restrained surface separation.
- Light theme: very light warm orange background and light surfaces.
- Red-orange accent for primary actions and selected states.
- Maintain readable theme-specific foreground colors; a shared brand accent does not require identical foreground combinations in both themes.
- Distinguish personal and group tasks with a small text label, not color alone.
- Use the accepted Plus Jakarta Sans typography with Angular Material's supported theming APIs; normalize the exported token values before implementation.
- Label untimed tasks `Do zrobienia`. Preserve point-based scheduling and the original dates of overdue tasks.
- Keep mobile targets comfortably tappable and preserve keyboard focus visibility.

## 7. Review scenarios

- A normal day with timed, untimed, personal, and group tasks.
- An overdue task that keeps its original date.
- Completing a task and finding it in the completed section.
- Creating a short task quickly, then adding optional details.
- A long title and description on a narrow screen.
- An empty day with a clear creation action.
- Both themes at desktop and mobile widths.

After the main design is accepted, add loading, save failure, validation, and disconnected-update states before implementing the corresponding behavior.

## Reference

- [Daylo — Today in Figma](https://www.figma.com/design/mNIbO3VXiUCK4WXxwg07pa): first visual draft, four native editable frames (desktop/mobile, light/dark). Material 3 checkbox, text-field, and button instances; custom navigation and point timeline. Roboto typography and Material Symbols. Static compositions; task creation, completion, and navigation interactions are pending.
- Figma frame IDs: desktop light `7:2607`, desktop dark `7:2710`, mobile light `7:2812`, mobile dark `7:2913`.
- The connected file supports one variable mode per collection. Light and dark colors therefore use separate Daylo collections. Desktop frames are 1280 × 900; mobile frames are 390 × 1120 to show the full content.
- [Angular Material theming](https://material.angular.dev/guide/theming)
