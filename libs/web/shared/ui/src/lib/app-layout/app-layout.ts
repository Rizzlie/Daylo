import { NgTemplateOutlet } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  Component,
  TemplateRef,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { map } from 'rxjs';

export interface LayoutAccountContext {
  compact: boolean;
}

@Component({
  selector: 'lib-app-layout',
  imports: [
    NgTemplateOutlet,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatTooltipModule,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
})
export class AppLayout {
  readonly navigationEnabled = input(false, { transform: booleanAttribute });
  readonly sidebarCollapsed = input(false, { transform: booleanAttribute });
  readonly skipTarget = input.required<string>();
  readonly accountTemplate = input.required<TemplateRef<LayoutAccountContext>>();
  readonly sidebarToggle = output<void>();

  protected readonly desktop = toSignal(
    inject(BreakpointObserver)
      .observe('(min-width: 768px)')
      .pipe(map((result) => result.matches)),
    { initialValue: false },
  );
  protected readonly sidebarWidth = computed(() => (this.sidebarCollapsed() ? 80 : 256));
  protected readonly collapseLabel = computed(() =>
    this.sidebarCollapsed() ? 'Rozwiń nawigację' : 'Zwiń nawigację',
  );
  protected readonly mobileDestinations = [
    { label: 'Grupy', icon: 'groups' },
    { label: 'Ustawienia', icon: 'settings' },
  ];
}
