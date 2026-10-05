# Daylo — Design System and Material Mapping

Status: Refined specification, 2026-10-05. The visual direction is accepted. The global Material theme has been implemented; full rendered component review and human acceptance remain pending.

## Source of truth

Use [tokens.json](tokens.json) for exact values and this document for their meaning and behavior. Tokens are plain documentation data, not a ready-to-import Angular Material palette or a standard interchange-format claim. The accepted screenshots and HTML define visual intent; the all-states HTML has an owner-requested desktop dark-mode correction recorded below, while screenshots remain unchanged. This document supersedes conflicting values and out-of-scope suggestions in the generated `warm_modern_planner/DESIGN.md`.

The existing exports have no pinned Angular version. Confirm compatible Angular/Material/Nx versions in F01 before choosing concrete Sass APIs. Keep the logo, card structure, warm canvas, gray dark theme, and compact point timeline. Do not reproduce the prototype controller banner or add calendar, subtasks, drag ordering, assignment, or duration blocks.

## Color roles

The neutral colors follow the accepted all-states HTML. `brand` remains the recognizable orange for the logo and decorative markers. Interactive primary colors deliberately differ from the logo color to preserve readable foregrounds. Use semantic roles, not arbitrary hex values scattered across components.

| Role | Light | Dark | Usage |
| --- | --- | --- | --- |
| canvas | #FFF8F4 | #18181B | Application background |
| surface | #FFFFFF | #242428 | Sidebar and main card |
| surfaceRaised | #FFFDFC | #2C2C32 | Compact task rows |
| text | #1F1B18 | #F4F4F6 | Primary copy |
| muted | #756D67 | #A1A1AA | Date and task metadata |
| border | #EFEAE6 | #35353C | Decorative dividers and surface edges |
| controlOutline | #8A7D75 | #A1A1AA | Identifiable unchecked controls |
| primary / onPrimary | #C43D17 / #FFFFFF | #FF9D7C / #3E160B | Action buttons and checked controls |
| primaryContainer | #FFF1EC | #493129 | Selected navigation surface |
| overdue / overdueSurface | #D61F4B / #FFF1F2 | #FDA4AF / #3B2029 | Overdue metadata, with explicit text |

Do not use the subtle decorative border as the only way to identify a form control. Inputs need a persistent visible label, distinct surface, supported Material outline styling, and a focus indicator. Do not communicate completion, selection, errors, or group visibility through color alone. Overdue tasks retain an explicit `Termin:` label; overdue is not a form-validation error.

### Contrast evidence

Calculated from solid sRGB colors using relative luminance (ratios rounded to two decimals):

| Pair | Ratio | Decision |
| --- | --- | --- |
| Export brand #F05023 / white | 3.57:1 | Reject for normal white button text |
| Light primary / white | 5.21:1 | Use for filled action buttons |
| Light primary / warm canvas | 4.96:1 | Use for action text |
| Light muted / warm canvas | 4.83:1 | Use instead of exported #7A726C (4.49:1) |
| Dark muted / surface | 6.03:1 | Keep |
| Dark primary / onPrimary | 7.83:1 | Use together |
| Light controlOutline / white | 3.98:1 | Suitable for control identification |
| Light overdue / overdueSurface | 4.60:1 | Use together |
| Dark overdue / overdueSurface | 7.80:1 | Use together |

These calculations do not certify the complete interface. Verify rendered hover/focus states, transparency, overlays, and actual control boundaries during implementation. Never lower completed-task text opacity indiscriminately; use readable muted text plus a checkmark and optional strikethrough.

## Typography, geometry, and identity

Use Plus Jakarta Sans throughout, including Material dialogs and menus. Greeting: 40/48 px desktop and 28/36 px mobile. Task titles and input text: 16/24 px. Section labels: 18/24 px, weight 600. Metadata: 14/20 px. Reserve 12/16 px for supplemental captions, not essential actions or due dates. Use sentence case for `Plan dnia`, `Do zrobienia`, `Zaległe`, and `Ukończone` rather than forcing uppercase.

Use the 4/8/16/24/32/48 px spacing scale. Desktop main card radius is 32 px; mobile 24 px; rows 16 px; inputs 12 px. Standard Material controls retain their supported geometry when no public customization exists. Density starts at 0; compact visual rows do not justify shrinking checkbox hit areas. Targets are at least 44 × 44 px; task rows start at 56 px and grow with wrapped content.

Preserve the exported Daylo check/sunrise logo as the approved mark proposal. Extract a clean SVG from the HTML during the requested UI implementation; do not use the PNG screenshot as the final asset. Wordmark is `daylo`. Avatar uses the signed-in Google profile image when available and initials as fallback. `MS` and `Maciej` are fixture data, not hardcoded account identity. Avatar is decorative next to the account name; an interactive account control needs its own accessible label.

## Responsive layout

- Below 768 px viewport width: no sidebar; one-column content and bottom navigation (`Dzisiaj`, `Grupy`, `Ustawienia`). Outer margin 16 px, card padding 16 px, minimum bottom-nav height 72 px plus safe-area inset. Content bottom clearance includes the complete nav height and 16 px extra space.
- From 768 px: sidebar with 256 px expanded / 80 px collapsed width. Main padding is 24 px, increasing to 48 px at wide desktop widths. Settings and account remain bottom-anchored via a flexible spacer. Preserve sidebar access when vertical space is limited.
- Split task content into two columns only when the card's available inner width is at least 880 px, independent of the viewport breakpoint. Otherwise stack sections. Main content max width is 1280 px excluding sidebar and outer gutters. Column gap 32 px.
- Timeline is an ordered list of point tasks, not calendar blocks. Group labels move beneath a long title when space is constrained. Rows grow vertically; do not ellipsize away the entire task title or overdue date.
- Quick creation places the input beside `Dodaj` when there is room. At narrow widths let the action wrap below rather than compressing the input. Expanded options stack vertically on mobile. Do not duplicate the date/visibility summary if the controls already show those values.
- Collapsed navigation keeps logo, icons, settings, avatar, and an always-reachable toggle. Labels remain available to assistive technology and via tooltips; tooltips are supplemental, not accessible names.

Breakpoint values are initial specifications, not a claim that the exports have passed responsive checks. Review at 360, 390, 768, 1024, and 1440 px, with both sidebar states where applicable, long copy, and text zoom.

## Angular Material mapping

| Element | Material building block | Daylo composition / behavior |
| --- | --- | --- |
| Desktop sidebar | Sidenav, navigation list, icon button, tooltip | Expanded/collapsed shell; bottom settings/account; `aria-current` on active route |
| Mobile navigation | Buttons and icons | Semantic `nav` with router links, custom bottom layout; no dedicated bottom-nav assumption |
| Main content card | Card | One main surface; compact semantic task rows inside |
| Quick creation | Form field, input, button | Always-visible accessible title label; preserve values on failed save |
| More options | Button and disclosure region | `aria-expanded`, controlled region; date/time/description/group fields |
| Date / time | Datepicker; input in form field | Date required; optional validated point time in user timezone |
| Visibility | Select | `Osobiste` or specific group; label `Widoczność`, not assignment; immutable on edit in MVP |
| Task completion | Checkbox | Accessible task-title label; shared state; no nested interactive row click target |
| Task details | Button/link and dialog | Separate from checkbox; title, date, optional time/description |
| Task actions / deletion | Menu and dialog | Edit/delete actions; explicit delete confirmation |
| Completed section | Expansion panel | Collapsed by default, accurate count; no double toggle control |
| Errors / feedback | Form-field errors and snackbar | Durable inline retry for save failures; toast only supplemental |
| Timeline, group badge, logo, avatar | Custom semantic layout / SVG / image | Layout and content assets, not invented Material components |

No checkbox rounding or internal `.mat-mdc-*` / `.mdc-*` selectors are justified by pixel matching. Use supported theming/override APIs in the installed version. Apply themes at the document/overlay scope so dialogs, datepickers, selects, and tooltips inherit the active theme.

Current Material guidance describes `mat.theme` for color/typography/density and `color-scheme` for theme selection; custom palettes must be complete tonal palettes. The flat Daylo JSON is not such a palette. Generate/validate a compatible palette and apply supported semantic/component overrides when implementation is authorized. [Official theming source](https://github.com/angular/components/blob/main/guides/theming.md), [theming guide](https://material.angular.dev/guide/theming).

## Interaction and review rules

Default appearance follows the system, with persisted light/dark/system preference. Playful suffix can be disabled in Settings. Sidebar collapse is a shell interaction; avoid adding an unrelated configuration screen. Use 200 ms for sidebar motion and 150 ms for feedback; remove nonessential transitions for reduced motion.

Quick creation defaults to today and personal visibility. User data and group names come from the API. Today summary uses `Na dziś` for unfinished timed + untimed tasks, with a separate `Zaległe` count. For the supplied fixture these are 5 and 1. Completed uses the product requirement's union of tasks scheduled for today or completed today without duplicates. Section counts derive from displayed data. Reevaluate at midnight and on foreground return.

Pending screen states: loading; empty day with overdue tasks still visible; completely empty plan with creation prompt; field validation; failed save retaining input and retry; task details; delete confirmation; lost shared-update connection and recovered state. Preserve keyboard focus when rows move after completion; do not use a temporary toast as the only indication of failure. These are requirements for the corresponding implementation slices, not features delivered by the export.

## Verification boundary

Completed: source comparison, normalized tokens, numerical contrast calculations, component mapping, scope and responsive specification. Theme implementation and verification are recorded below. Full component, interaction, keyboard/focus/zoom verification and application E2E remain pending.

## Desktop prototype dark-mode correction — 2026-10-05

The owner requested a correction to [the all-states HTML prototype](daylo_ekran_dzisiaj_desktop_mobile_wszystkie_stany/code.html). The toolbar's theme button toggles the `dark` class on the body. Desktop Tailwind variants now cover the sidebar, account card, headings, summary, quick creation and expanded fields, task rows and badges, overdue tasks, completed tasks, and the empty card. Desktop surfaces, text, primary foreground/background, borders, overdue roles, and sidebar shadow use the dark values in `tokens.json`. Native controls use `color-scheme: dark`; interactive elements have a visible focus outline. Completed text keeps readable muted color without reduced opacity in dark mode. Desktop inline color mutations were removed so CSS owns appearance across repeated theme switches.

This correction affects the HTML reference, not Angular application behavior or the mobile prototype. The toolbar remains a demonstration tool. The empty-state switch still only changes desktop content, and sample counters are not connected to that state. Layout, typography, and all other uncorrected export differences remain subject to the refined specification.

Verification: both inline JavaScript scripts parsed successfully; static checks confirmed desktop dark variants for task rows, primary buttons, overdue and empty surfaces, and the absence of old desktop inline color overrides. Interactive and visual verification remain incomplete: the Playwright browser profile was busy, and the alternative browser rejected local `file://` navigation. No full state-matrix or browser acceptance is claimed.

## Theme implementation — 2026-10-05

The requested theme slice uses Angular Material 22.2.1, its official `theme-color` generator through Nx, `mat.theme`, `mat.theme-overrides`, and public card/form-field overrides. The generated complete tonal palettes are in `apps/web/src/theme/_theme-colors.scss`; exact Daylo roles and responsive typography are in `_daylo.scss`, imported by global `styles.scss`. Plus Jakarta Sans Variable is loaded locally by the existing build configuration. Validation error colors retain the generated Material palette; overdue colors are separate application tokens.

The document defaults to `color-scheme: light dark`. Set `data-theme="light"` or `data-theme="dark"` on `<html>` to force a variant; remove the attribute or use `system` to follow the system. Document scope includes Material overlays. Theme selection UI and persistence are outside this requested slice. No provider changes in `app.config.ts` are required.

Verification: production `web:build` and `web:lint` passed. Browser inspection of the running shell at 1440 × 900 confirmed light/dark canvas and text colors and the loaded font. At 390 × 844, forced light appearance over a dark system preference, 28 px greeting, 24 px card radius, and no horizontal overflow were confirmed. No console errors were reported. The shell currently has no rendered controls or routes, so actual Material control/overlay appearance, focus states and complete responsive layout remain unverified. The existing E2E sample expects an absent `Welcome` heading and was not used as theme acceptance evidence.

Retrospective: Nx subprocesses were blocked by the sandbox; build and lint passed with approved execution outside it. Generator dry-run caught the requirement for a trailing slash in its directory argument. Inspect the generator output path and use resolved Nx targets before future verification.

### Theme follow-up review — 2026-10-05

The saved normalized color and typography values matched the previous theme baseline. The follow-up completed previously omitted tokens: light/dark sidebar, card and bottom-navigation shadows; pill radius; explicit body/label weights and zero tracking; and form-field input typography at 16/24 px. Elevated Material cards consume the documented card shadow through the public override API. Shadow selection follows system appearance or the document's explicit variant, including `data-theme="system"`. Full feature layouts are still pending; shadow tokens do not implement navigation.

Production build and lint passed after these changes. Browser checks at 1440 × 900 confirmed dark system shadows, forced light/dark shadows and their Material card mapping. At 390 × 844, the system variant retained dark shadows, the greeting was 28 px, the card radius was 24 px and there was no horizontal overflow. No console errors were reported. Human acceptance and rendered Material control/overlay verification remain pending because the current application shell has no controls. Automated application E2E remains incomplete as recorded above. Retrospective: inspect missing semantic/component mappings as well as color values; unchanged colors do not establish complete theme coverage.
