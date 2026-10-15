import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

const STORAGE_KEY = 'daylo.sidebar.collapsed';

@Injectable({ providedIn: 'root' })
export class SidebarPreference {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly value = signal(this.read());
  readonly collapsed = this.value.asReadonly();

  toggle(): void {
    this.value.update((collapsed) => !collapsed);
    try {
      this.window?.localStorage.setItem(STORAGE_KEY, String(this.value()));
    } catch {
      // Navigation stays usable when browser storage is unavailable.
    }
  }

  private read(): boolean {
    try {
      return this.window?.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
