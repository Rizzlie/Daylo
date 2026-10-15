import { TestBed } from '@angular/core/testing';
import { SidebarPreference } from './sidebar-preference';

describe('sidebar preference', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('defaults to expanded and restores the user choice after a new app instance', () => {
    const preference = TestBed.inject(SidebarPreference);
    expect(preference.collapsed()).toBe(false);
    preference.toggle();
    TestBed.resetTestingModule();
    const restored = TestBed.inject(SidebarPreference);
    expect(restored.collapsed()).toBe(true);
    restored.toggle();
    expect(restored.collapsed()).toBe(false);
  });

  it('ignores an invalid saved value', () => {
    localStorage.setItem('daylo.sidebar.collapsed', 'invalid');
    expect(TestBed.inject(SidebarPreference).collapsed()).toBe(false);
  });

  it('allows toggling when storage reads and writes are blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    const preference = TestBed.inject(SidebarPreference);
    expect(preference.collapsed()).toBe(false);
    expect(() => preference.toggle()).not.toThrow();
    expect(preference.collapsed()).toBe(true);
  });
});
