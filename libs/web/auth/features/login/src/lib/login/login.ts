import { Component, DestroyRef, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { switchMap } from 'rxjs';
import { AuthSession, getAuthRedirectUrl } from '@daylo/web/core/auth/data-access';
import { injectQueryParamMap } from '@daylo/web/shared/util-router';
import { LOGIN_NOTICES } from './login-notice';

@Component({
  selector: 'lib-login',
  imports: [MatButtonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly queryParams = injectQueryParamMap();

  protected readonly isLoading = computed(() => this.auth.status() === 'loading');
  protected readonly notice = computed(() =>
    LOGIN_NOTICES.get(this.queryParams().get('error') ?? ''),
  );
  protected readonly canRetry = computed(() => this.notice()?.retry ?? false);

  protected retry(): void {
    this.auth.refresh().pipe(
      switchMap((session) => this.router.navigateByUrl(
        getAuthRedirectUrl(session, 'public') ?? '/login',
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }
}
