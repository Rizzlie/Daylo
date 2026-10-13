import { createHash, randomBytes } from 'node:crypto';
import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OAuthTransactionStore } from '@daylo/api/auth/data-access';
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
  ) {}

  async start(): Promise<{ browserBinding: string; redirectUrl: string }> {
    const state = randomValue();
    const nonce = randomValue();
    const browserBinding = randomValue();
    const now = new Date();
    const redirectUrl = this.provider.authorizationUrl(state, nonce);
    try {
      await this.transactions.create(
        {
          stateHash: hash(state),
          browserBindingHash: hash(browserBinding),
          nonce,
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
  ): Promise<VerifiedGoogleIdentity> {
    if (!validBinding(input.state) || !validBinding(browserBinding))
      throw authenticationFailed();
    let nonce: string | null;
    try {
      nonce = await this.transactions.consume(
        hash(input.state),
        hash(browserBinding),
        new Date(),
      );
    } catch {
      throw new ServiceUnavailableException();
    }
    if (!nonce || input.error !== undefined || !input.code)
      throw authenticationFailed();
    return this.provider.verify(input.code, nonce);
  }
}
