import { Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap } from '@angular/router';

/** Returns the current route's query parameters; call in an injection context. */
export function injectQueryParamMap(): Signal<ParamMap> {
  const route = inject(ActivatedRoute);

  return toSignal(route.queryParamMap, {
    initialValue: route.snapshot.queryParamMap,
  });
}
