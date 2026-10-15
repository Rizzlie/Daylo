import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthSession } from '@daylo/web/core/auth/data-access';
import { Today } from './today';

describe('Today page', () => {
  it('renders its heading and reactive identity without session-status or route-data dependencies', async () => {
    const user = signal({ displayName: 'Synthetic User' });
    TestBed.configureTestingModule({
      imports: [Today],
      providers: [{ provide: AuthSession, useValue: { user } }],
    });
    const fixture = TestBed.createComponent(Today);
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('[role="status"]')).toBeNull();
    expect(page.querySelector('h1')?.textContent).toBe('Dzisiaj');
    expect(page.querySelector('.greeting')?.textContent).toBe('Cześć, Synthetic User');
    user.set({ displayName: 'Updated Synthetic User' });
    await fixture.whenStable();
    expect(page.querySelector('.greeting')?.textContent).toBe('Cześć, Updated Synthetic User');
  });
});
