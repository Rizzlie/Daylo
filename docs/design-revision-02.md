# Today — Visual Revision 02

Status: Revision guidance aligned with the accepted local design baseline in `docs/design`. The earlier Figma draft is historical and is no longer a target. Implementation and behavioral verification remain subject to explicitly requested backlog work.

## Direction

Keep the approved light warm-orange and dark gray palette, red-orange accent, Plus Jakarta Sans typography, and Angular Material controls. Make the planner feel softer and more personal through the Daylo mark, rounded navigation, a single content surface, and an account avatar. Keep task rows compact instead of placing every task in a separate card.

Frontend-design guidance was read from the official source: https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md. User requirements take precedence over its general visual preferences.

## Required changes

| Element | Revision |
| --- | --- |
| Desktop navigation | Separate surface with a subtle 1 px theme-aware border, 20 px rounded corners, and a restrained shadow. Use a 16 px inset from the window edges. |
| Navigation label | Replace the UI label `Grupa` with `Grupy` on desktop and mobile. This is a navigation-label change; additional group-management behavior is not implied. |
| Settings | Anchor `Ustawienia` at the bottom of desktop navigation using a flexible spacer. Keep it as the last mobile navigation destination. |
| Collapse control | Add an explicit 44 × 44 px desktop toggle with a chevron and accessible labels `Zwiń menu` / `Rozwiń menu`. Expanded width approximately 240 px; collapsed rail approximately 80 px. |
| Collapsed navigation | Keep the logo mark, navigation icons, settings, and avatar visible. Hide the wordmark and labels; show label tooltips on hover/focus. Use the local light/dark collapsed compositions as visual references; verify collapse and expansion when the application behavior is implemented. |
| Logo | Add a native editable SVG mark beside `daylo`: rounded lowercase `d` incorporating a timeline point. Reuse the mark alone on the collapsed rail. This is an initial logo proposal for review. |
| Avatar | Show a circular desktop avatar with `MS` placeholder initials and the name `Maciej` near the bottom of the sidebar. Use the Google profile photo when implemented and available; initials are the fallback. Collapsed rail retains the avatar without the name. |
| Untimed section | Rename `Bez godziny` to `Do zrobienia`. The section still contains tasks without a scheduled time. |
| Content | Place quick creation, timeline, untimed tasks, overdue tasks, and completed-section disclosure inside one main card. Keep greeting/date above the card. Use a theme surface, subtle border, 24 px desktop / 20 px mobile radius, and 24 px desktop / 16 px mobile padding. |
| Inputs and rows | Soften input corners using Material-compatible geometry (approximately 12 px); preserve 44 px or larger interaction targets. Avoid applying the same radius to every element. |
| Mobile menu | Add a subtle top border, small upward shadow, and rounded upper corners. Preserve device safe-area space and content clearance. |

## Review criteria

- Light/dark desktop/mobile layouts follow the accepted local PNG compositions and refined design tokens.
- Desktop collapsed layouts retain recognizable navigation, settings, and avatar in both themes.
- Desktop menu toggle supports collapse and expansion in both themes when implemented.
- Settings stays at the bottom when navigation height changes.
- Card and navigation borders are distinguishable against each theme background without dominating task content.
- Long task titles remain readable at 390 px mobile width; the card does not create horizontal overflow.
- No task content or action is hidden beneath mobile navigation.
- When implemented, the logo uses an SVG asset, the avatar supports a profile image or initials, and controls and UI text use native application elements.
- Initials are explicitly treated as a placeholder, not a claim that the user's actual Google avatar was retrieved.

## Design baseline

- [Accepted design sources](design/README.md): baseline ownership, source precedence, and remaining refinements.
- [Desktop and mobile states](design/daylo_ekran_dzisiaj_desktop_mobile_wszystkie_stany/screen.png).
- [Light mobile composition](design/daylo_ekran_dzisiaj_mobilny_jasny/screen.png).
- [Logo mark](design/daylo_logo_mark/screen.png).
- [Normalized design system](design/design-system.md) and [tokens](design/tokens.json): refined roles, geometry, responsive rules, and Angular Material mapping.

The local exports in `docs/design` are the current visual baseline. Preserve the original PNGs and companion exports. The earlier Figma URL and node identifiers are no longer implementation references.

No application implementation is authorized by this revision. Static design references do not verify application behavior, accessibility, or responsiveness; those checks remain pending for the relevant implementation slices.
