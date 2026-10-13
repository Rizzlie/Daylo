export interface SessionIdentity {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
}

export type SessionResult =
  | { readonly status: 'active' | 'pending'; readonly user: SessionIdentity }
  | {
      readonly status: 'anonymous';
      readonly reason: 'expired' | 'signed-out' | null;
    }
  | { readonly status: 'error' };

export type SessionState =
  | SessionResult
  | { readonly status: 'unknown' | 'loading' };

export function isSessionResult(state: SessionState): state is SessionResult {
  return state.status !== 'unknown' && state.status !== 'loading';
}
