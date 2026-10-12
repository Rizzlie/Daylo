/** SetMetadata keys consumed by the global session guard. */
export const PUBLIC_ENDPOINT = 'daylo:public-endpoint';
export const ALLOW_PENDING_SESSION = 'daylo:allow-pending-session';

export interface ActorContext {
  sessionId: string;
  userId: string;
  email: string;
  displayName: string;
  accessStatus: 'pending' | 'active';
}
