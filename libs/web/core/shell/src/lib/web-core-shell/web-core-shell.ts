import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AuthSession } from '@daylo/web/core/auth/data-access';
import { injectRouteData } from '@daylo/web/shared/util-router';

@Component({
  selector: 'lib-web-core-shell',
  imports: [MatButtonModule],
  templateUrl: './web-core-shell.html',
  styleUrl: './web-core-shell.scss',
})
export class WebCoreShell {
  private readonly auth = inject(AuthSession);
  private readonly routeData = injectRouteData();
  protected readonly isLoading = computed(() => this.auth.status() === 'loading');
  protected readonly heading = computed(() => this.routeData()['heading']);
  protected readonly signingOut = this.auth.signingOut;
  protected readonly signOutFailed = this.auth.signOutFailed;
  protected readonly signOutRateLimited = this.auth.signOutRateLimited;
  protected readonly signOutLabel = computed(() =>
    this.signingOut() ? 'Wylogowywanie…' : 'Wyloguj się',
  );
  protected readonly user = this.auth.user;

  protected signOut(): void {
    this.auth.signOut();
  }
}
