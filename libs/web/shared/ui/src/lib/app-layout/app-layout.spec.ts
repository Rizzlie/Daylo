import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';
import { AppLayout } from './app-layout';

@Component({
  imports: [AppLayout],
  template: `
    <ng-template #account let-compact="compact">
      <button [attr.data-compact]="compact">Synthetic account</button>
    </ng-template>
    <lib-app-layout
      [navigationEnabled]="navigationEnabled()"
      [sidebarCollapsed]="collapsed()"
      [skipTarget]="skipTarget()"
      [accountTemplate]="account"
      (sidebarToggle)="toggles = toggles + 1"
    >
      <h1>Projected screen</h1>
      <p role="alert">Projected status</p>
    </lib-app-layout>
  `,
})
class LayoutHost {
  readonly navigationEnabled = signal(true);
  readonly collapsed = signal(false);
  readonly skipTarget = signal('/today#main-content');
  toggles = 0;
}

describe('AppLayout presentation contract', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LayoutHost],
      providers: [
        provideRouter([]),
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: true }) } },
      ],
    });
  });

  async function open() {
    const fixture = TestBed.createComponent(LayoutHost);
    await fixture.whenStable();
    return fixture;
  }

  it('projects screen content and account templates without application providers', async () => {
    const fixture = await open();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelectorAll('main h1')).toHaveLength(1);
    expect(page.querySelector('main [role="alert"]')?.textContent).toBe('Projected status');
    expect(page.querySelector('.sidebar [data-compact]')?.getAttribute('data-compact')).toBe(
      'false',
    );
    expect(page.querySelector('.mobile-header [data-compact]')?.getAttribute('data-compact')).toBe(
      'true',
    );
    fixture.componentInstance.skipTarget.set('/invitations#main-content');
    await fixture.whenStable();
    expect(page.querySelector('.skip-link')?.getAttribute('href')).toBe(
      '/invitations#main-content',
    );
  });

  it('emits a toggle request and renders only the collapsed state supplied by its parent', async () => {
    const fixture = await open();
    const page: HTMLElement = fixture.nativeElement;
    const toggle = page.querySelector<HTMLButtonElement>('.collapse-toggle');
    toggle?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.toggles).toBe(1);
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    fixture.componentInstance.collapsed.set(true);
    await fixture.whenStable();
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(page.querySelector('.sidebar [data-compact]')?.getAttribute('data-compact')).toBe(
      'true',
    );
    expect((page.querySelector('.workspace') as HTMLElement).style.marginLeft).toBe('80px');
  });

  it('removes feature navigation while preserving projected content and compact account access', async () => {
    const fixture = await open();
    fixture.componentInstance.navigationEnabled.set(false);
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('mat-nav-list, nav, .collapse-toggle')).toBeNull();
    expect(page.querySelector('.mobile-header [data-compact="true"]')).not.toBeNull();
    expect(page.querySelector('main h1')?.textContent).toBe('Projected screen');
    expect((page.querySelector('.workspace') as HTMLElement).style.marginLeft).toBe('0px');
  });
});
