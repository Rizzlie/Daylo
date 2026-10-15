# web-core-shell

Contains the M05-02 responsive protected application layout.
Application routes lazily load `AuthenticatedShell` with a child router outlet.
Today and Invitations live in their respective feature libraries, composed by
application routing. This library contains only the protected shell integration,
account menu and sidebar preference; it does not import feature pages.
The login page belongs to `@daylo/web/auth/features/login`; route composition
belongs to `apps/web`, which imports authentication providers and guards directly.
`AuthenticatedShell` composes `AppLayout` from `@daylo/web/shared/ui`, passing navigation
visibility, the stored collapsed state, the current-route skip target and an
account template. It handles the layout's toggle event and projects sign-out
feedback and the child router outlet into its content area. The shared layout
owns Material Sidenav, responsive navigation, branding, tooltips and icons;
the core shell owns application state and integration.
The shell owns the shared session-loading status during revalidation and hides
page content while keeping the child router outlet mounted. Feature pages do not
render session-loading UI; their local state survives the check. Initial entry
still waits for the route guard, with the existing app-level preparation screen.
Groups and Settings show `Wkrótce` and remain unavailable until their tasks ship.

`SidebarPreference` defaults to expanded and stores only an explicit user choice
under `daylo.sidebar.collapsed` in local storage. Storage failure keeps the
in-memory interaction usable. Mobile layout does not modify the desktop choice.
`AccountMenu` derives initials from the session identity and owns the account
trigger, menu and sign-out action; no profile
image or API contract change is included. Pending users see branding, their
account and invitation content without active-user navigation.

Reusable guards and `getAuthRedirectUrl` belong to auth data-access. Templates
read separate named signals for layout, loading, heading and sign-out state, without a
combined view model. Shell displays session data and invokes sign-out; it does not
listen for visibility events, check access or navigate on session loss. The auth
lifecycle provider registered once by the app owns those responsibilities.

## Running unit tests

Run `npm exec nx -- run web-core-shell:test`.
