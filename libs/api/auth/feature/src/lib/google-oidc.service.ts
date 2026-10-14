import { createHash, randomBytes } from 'node:crypto';
import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OAuthTransactionStore } from '@daylo/api/auth/data-access';
import { SecurityEvents, SecurityEventInput } from '@daylo/api/core/security-events';
import { OAuthPkceService, PkceBinding } from './oauth-pkce.service';
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

type CallbackRejectionReason = Extract<SecurityEventInput, { event: 'callback_rejected' }>['reason'];

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
    if (!validBinding(input.state) || !validBinding(browserBinding))
      return this.rejectCallback('invalid_binding', request);
    const stateHash = hash(input.state);
    const browserBindingHash = hash(browserBinding);
    // Consume before provider outcome/PKCE validation; every valid attempt is single-use.
    const transaction = await this.consumeTransaction(stateHash, browserBindingHash);
    if (!transaction) return this.rejectCallback('invalid_expired_or_replayed_transaction', request);
    if (input.error !== undefined) return this.rejectCallback('provider_declined', request);
    if (!input.code) return this.rejectCallback('missing_code', request);
    const verifier = this.recoverVerifier(transaction.encryptedVerifier, {
      stateHash, browserBindingHash, nonce: transaction.nonce,
    }, request);
    return this.provider.verify(input.code, transaction.nonce, verifier);
  }

  private async consumeTransaction(stateHash: string, browserBindingHash: string) {
    try {
      return await this.transactions.consume(
        stateHash,
        browserBindingHash,
        new Date(),
      );
    } catch {
      throw new ServiceUnavailableException();
    }
  }

  private recoverVerifier(encryptedVerifier: string | null, binding: PkceBinding, request?: object): string {
    try {
      return this.pkce.recover(encryptedVerifier, binding);
    } catch {
      return this.rejectCallback('invalid_pkce', request);
    }
  }

  private rejectCallback(reason: CallbackRejectionReason, request?: object): never {
    this.events.record({ event: 'callback_rejected', reason }, request);
    throw authenticationFailed();
  }
}
