import { SessionResult } from './auth-session.model';

export type AuthAccessPolicy = 'public' | 'active' | 'pending' | 'authenticated';

export function getAuthRedirectUrl(
  session: SessionResult,
  access: AuthAccessPolicy,
): string | null {
  switch (session.status) {
    case 'active':
      return access === 'public' || access === 'pending' ? '/today' : null;
    case 'pending':
      return access === 'public' || access === 'active' ? '/invitations' : null;
    case 'error':
      return session.reason === 'rate-limit' ? '/login?error=rate-limit' : '/login?error=connection';
    case 'anonymous':
      if (session.reason === 'signed-out') return '/login';
      return access !== 'public' || session.reason === 'expired'
        ? '/login?error=expired'
        : null;
  }
}
