# Daylo — Accepted Design Baseline

Accepted by the owner on 2026-10-05 as the visual baseline for further refinement. This approval does not authorize application implementation or certify that the exported prototype passes behavior, accessibility, or responsive tests.

## Sources

- [Normalized design system](design-system.md) and [tokens](tokens.json): authoritative refined roles, geometry, responsive rules, and Angular Material mapping. Rendered review remains pending.

- [Desktop and mobile states](daylo_ekran_dzisiaj_desktop_mobile_wszystkie_stany/screen.png), with [HTML reference](daylo_ekran_dzisiaj_desktop_mobile_wszystkie_stany/code.html).
- [Light mobile composition](daylo_ekran_dzisiaj_mobilny_jasny/screen.png), with [HTML reference](daylo_ekran_dzisiaj_mobilny_jasny/code.html).
- [Logo mark](daylo_logo_mark/screen.png), with [HTML reference](daylo_logo_mark/code.html).
- [Exported design specification](warm_modern_planner/DESIGN.md).

The exported compositions establish the visual direction: warm light surfaces, neutral gray dark surfaces, red-orange accent, Plus Jakarta Sans typography, rounded main content card, point timeline, compact task rows, bordered navigation, logo, bottom-anchored settings and desktop avatar. The sidebar supports a collapsed state. UI labels include `Grupy` and `Do zrobienia`.

Preserve the original screenshots and other exports. The all-states HTML reference received an owner-requested desktop dark-mode correction on 2026-10-05; its screenshot predates that correction. See the correction record in [the design system](design-system.md#desktop-prototype-dark-mode-correction--2026-10-05). The earlier Figma draft is historical, not the current source of truth. When the generated specification conflicts with the approved product requirements, product requirements take precedence.

## Refinements before implementation

1. Normalize colors into one light/dark token specification. The HTML, screenshots, and DESIGN.md currently differ. Check contrast rather than assuming the exported accent supports every text/background combination.
2. Check mobile at actual narrow viewport widths, including 390 px, long titles, minimum 44 px interaction areas, and safe-area clearance. The provided screenshot alone does not verify responsiveness.
3. Correct sample dates: 2 October 2025 is Thursday, while 2 October 2026 is Friday. Production dates derive from the user's timezone.
4. Derive counters from data and define their scope explicitly. The sample shows five tasks in today's timed/untimed sections plus one overdue task; a global active-task total must not misleadingly show five. Keep a today-only count clearly labeled if that interpretation is chosen.
5. Exclude the prototype demonstration toolbar from the product UI. Sidebar workspace shortcuts and counters are visual proposals, not authorization for new filters or features.
6. Add loading, validation, retained-input save failure, disconnected shared-update, task details, and delete-confirmation states as needed by the existing backlog.
7. The exported specification's calendar, subtasks, drag ordering, duration blocks, and category-based time strips are outside the approved MVP. Scheduling remains a point in time.

## Implementation boundary

Use real Angular Material controls and supported theming APIs when the corresponding backlog item is requested. Tailwind CDN scripts, inline handlers, demo data, and the exported claim of Material compliance are not production implementation or verification evidence. Maintain English source identifiers and documentation, with Polish UI copy.

Review performed so far: static screenshots, exported specification, and selected HTML source. Running-browser interaction and mobile behavior verification remain pending.
