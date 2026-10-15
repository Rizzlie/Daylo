# web-shared-ui

Presentational Angular components for Daylo, consumed through
`@daylo/web/shared/ui`. Tags: `platform:web`, `scope:shared`, `type:ui`.
Components use inputs, outputs and projected content; they do not access
application stores, HTTP services or browser persistence.

`AppLayout` provides the Daylo responsive application frame: Material Sidenav,
256/80px desktop navigation, mobile header and bottom navigation, branding,
Material icons, keyboard skip link and reduced-motion support. Existing design
system tokens and supported Material theming APIs determine its appearance.

Its inputs are `navigationEnabled`, `sidebarCollapsed`, `skipTarget` and an
`accountTemplate` with a `{ compact: boolean }` context. Its `sidebarToggle`
output requests a state change from the parent; the component never persists
or changes the supplied collapse state itself. Default projected content appears
inside the main landmark. The account template allows the application to supply
its account control without introducing a shared-UI dependency on authentication.

The existing Daylo navigation destinations are part of this application frame;
Groups and Settings remain unavailable until their feature tasks are delivered.
Do not add speculative controls or wrap every Material component.

Run `npm exec nx run web-shared-ui:test` and
`npm exec nx run web-shared-ui:lint`. The library is non-buildable; the consuming
web production build compiles its source.
