import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthSession } from '@daylo/web/core/auth/data-access';
import { AppLayout } from '@daylo/web/shared/ui';
import { SidebarPreference } from '../sidebar-preference';
import { AccountMenu } from '../account-menu/account-menu';

@Component({
  selector: 'lib-authenticated-shell',
  imports: [AppLayout, RouterOutlet, AccountMenu],
  templateUrl: './authenticated-shell.html',
  styleUrl: './authenticated-shell.scss',
})
export class AuthenticatedShell {
  private readonly auth = inject(AuthSession);
  private readonly router = inject(Router);
  protected readonly skipTarget = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.split('#')[0] + '#main-content'),
    ),
    { initialValue: this.router.url.split('#')[0] + '#main-content' },
  );
  protected readonly sidebar = inject(SidebarPreference);
  protected readonly isLoading = computed(() => this.auth.status() === 'loading');
  protected readonly active = computed(() => this.auth.status() === 'active');
  protected readonly signingOut = this.auth.signingOut;
  protected readonly signOutFailed = this.auth.signOutFailed;
  protected readonly signOutRateLimited = this.auth.signOutRateLimited;
}
