import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_PENDING_SESSION, ActorContext, PUBLIC_ENDPOINT } from '@daylo/api/core/identity/contracts';
import type { StoredSession } from '@daylo/api/auth/data-access';
import type { Request, Response } from 'express';
import { SecurityEvents } from '@daylo/api/core/security-events';
import { SessionService } from './session.service';

export interface AuthenticatedRequest extends Request {
  dayloSession: StoredSession;
  actor: ActorContext;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function actorFromSession(session: StoredSession): ActorContext {
  return {
    sessionId: session.id,
    userId: session.user.id,
    email: session.user.email,
    displayName: session.user.displayName,
    accessStatus: session.user.accessStatus === 'ACTIVE' ? 'active' : 'pending',
  };
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(SecurityEvents) private readonly events: SecurityEvents,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ENDPOINT, targets)) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader('Cache-Control', 'no-store');
    const session = await this.sessions.authenticate(request, response);
    const actor = actorFromSession(session);
    this.requireAllowedAccess(actor, request, context);
    if (!SAFE_METHODS.has(request.method)) {
      this.sessions.verifyMutation(request, session);
    }
    request.dayloSession = session;
    request.actor = actor;
    return true;
  }

  private requireAllowedAccess(actor: ActorContext, request: Request, context: ExecutionContext): void {
    const allowed = actor.accessStatus !== 'pending'
      || this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_SESSION, [context.getHandler(), context.getClass()]);
    if (allowed) return;
    this.events.record({ event: 'admission_denied', reason: 'pending_access' }, request, actor.userId);
    throw new ForbiddenException();
  }
}
