import { Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthSession } from '@daylo/web/core/auth/data-access';

@Component({
  selector: 'lib-account-menu',
  imports: [MatButtonModule, MatMenuModule, MatTooltipModule, MatIconModule],
  templateUrl: './account-menu.html',
  styleUrl: './account-menu.scss',
})
export class AccountMenu {
  readonly compact = input(false, { transform: booleanAttribute });
  private readonly auth = inject(AuthSession);
  protected readonly user = this.auth.user;
  protected readonly signingOut = this.auth.signingOut;
  protected readonly label = computed(() => 'Konto: ' + (this.user()?.displayName ?? ''));
  protected readonly signOutLabel = computed(() =>
    this.signingOut() ? 'Wylogowywanie…' : 'Wyloguj się',
  );
  protected readonly initials = computed(() => {
    const words = this.user()?.displayName.trim().split(/\s+/) ?? [];
    return [words[0], words.length > 1 ? words[words.length - 1] : undefined]
      .filter((word): word is string => Boolean(word))
      .map((word) => Array.from(word)[0])
      .join('')
      .toLocaleUpperCase('pl-PL');
  });

  protected signOut(): void {
    this.auth.signOut();
  }
}
