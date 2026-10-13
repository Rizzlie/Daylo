import { Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Data } from '@angular/router';

/** Returns the current route's data; call in an injection context. */
export function injectRouteData(): Signal<Data> {
  const route = inject(ActivatedRoute);

  return toSignal(route.data, {
    initialValue: route.snapshot.data,
  });
}
