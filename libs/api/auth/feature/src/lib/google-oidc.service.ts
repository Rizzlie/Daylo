import { createHash, randomBytes } from 'node:crypto';
import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OAuthTransactionStore } from '@daylo/api/auth/data-access';
import { SecurityEvents, SecurityEventInput } from '@daylo/api/core/security-events';
import { OAuthPkceService } from './oauth-pkce.service';
import {
  authenticationFailed,
  GoogleOidcProvider,
  VerifiedGoogleIdentity,
} from './google-oidc.provider';

export const OAUTH_TRANSACTION_SECONDS = 600;
export { OAUTH_BROWSER_COOKIE } from './auth-cookie';
const randomValue = () => randomBytes(32).toString('base64url');
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const validBinding = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);

@Injectable()
export class GoogleOidcService {
  constructor(
    @Inject(OAuthTransactionStore)
    private readonly transactions: OAuthTransactionStore,
    @Inject(GoogleOidcProvider) private readonly provider: GoogleOidcProvider,
    @Inject(OAuthPkceService) private readonly pkce: OAuthPkceService,
    @Inject(SecurityEvents) private readonly events: SecurityEvents,
  ) {}

  async start(): Promise<{ browserBinding: string; redirectUrl: string }> {
    const state = randomValue();
    const nonce = randomValue();
    const browserBinding = randomValue();
    const now = new Date();
    const binding = { stateHash: hash(state), browserBindingHash: hash(browserBinding), nonce };
    const { challenge, encryptedVerifier } = this.pkce.create(binding);
    const redirectUrl = this.provider.authorizationUrl(state, nonce, challenge);
    try {
      await this.transactions.create(
        {
          ...binding,
          encryptedVerifier,
          expiresAt: new Date(now.getTime() + OAUTH_TRANSACTION_SECONDS * 1000),
        },
        now,
      );
    } catch {
      throw new ServiceUnavailableException();
    }
    return { browserBinding, redirectUrl };
  }

  async callback(
    input: { state?: string; code?: string; error?: string },
    browserBinding?: string,
    request?: object,
  ): Promise<VerifiedGoogleIdentity> {
    const reject = (reason: Extract<SecurityEventInput, { event: 'callback_rejected' }>['reason']): never => {
      this.events.record({ event: 'callback_rejected', reason }, request);
      throw authenticationFailed();
    };
    if (!validBinding(input.state) || !validBinding(browserBinding))
      return reject('invalid_binding');
    const stateHash = hash(input.state);
    const browserBindingHash = hash(browserBinding);
    let transaction: { nonce: string; encryptedVerifier: string | null } | null;
    try {
      transaction = await this.transactions.consume(
        stateHash,
        browserBindingHash,
        new Date(),
      );
    } catch {
      throw new ServiceUnavailableException();
    }
    if (!transaction) return reject('invalid_expired_or_replayed_transaction');
    if (input.error !== undefined) return reject('provider_declined');
    if (!input.code) return reject('missing_code');
    let verifier: string;
    try {
      verifier = this.pkce.recover(transaction.encryptedVerifier, {
        stateHash, browserBindingHash, nonce: transaction.nonce,
      });
    } catch {
      return reject('invalid_pkce');
    }
    return this.provider.verify(input.code, transaction.nonce, verifier);
  }
}
