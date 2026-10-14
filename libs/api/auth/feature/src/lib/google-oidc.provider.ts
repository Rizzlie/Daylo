import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import { z } from 'zod';

export const GOOGLE_OAUTH_CLIENT = Symbol('GOOGLE_OAUTH_CLIENT');

export interface VerifiedGoogleIdentity {
  googleSubject: string;
  email: string;
  emailAuthoritative: boolean;
  displayName?: string;
}

export function authenticationFailed(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'GOOGLE_AUTHENTICATION_FAILED',
    message: 'Google authentication failed',
  });
}

export function providerUnavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    code: 'SERVICE_UNAVAILABLE',
    message: 'Google authentication is temporarily unavailable',
  });
}

const claimsSchema = z.object({
  sub: z.string().min(1).max(255),
  email: z.email().max(320),
  email_verified: z.literal(true),
  hd: z.string().trim().min(1).max(255).optional(),
  nonce: z.string().min(1),
  exp: z.number().int().positive(),
  iat: z.number().int().positive(),
  nbf: z.number().int().optional(),
  azp: z.string().optional(),
  name: z.string().trim().min(1).max(200).optional(),
});

type GoogleClaims = z.infer<typeof claimsSchema>;
type SigningCertificates = Awaited<ReturnType<OAuth2Client['getFederatedSignonCertsAsync']>>;

function validClaims(
  claims: GoogleClaims,
  nonce: string,
  clientId: string,
  now: number,
): boolean {
  const validLifetime = claims.exp > now && claims.iat <= now + 60 && claims.exp > claims.iat;
  const validNotBefore = claims.nbf === undefined || claims.nbf <= now + 60;
  const validAuthorizedParty = claims.azp === undefined || claims.azp === clientId;
  return validLifetime && validNotBefore && validAuthorizedParty && claims.nonce === nonce;
}

function mapIdentity(claims: GoogleClaims): VerifiedGoogleIdentity {
  return {
    googleSubject: claims.sub,
    email: claims.email,
    emailAuthoritative: claims.email.toLowerCase().endsWith('@gmail.com') || claims.hd !== undefined,
    ...(claims.name ? { displayName: claims.name } : {}),
  };
}

@Injectable()
export class GoogleOidcProvider {
  constructor(
    @Inject(GOOGLE_OAUTH_CLIENT) private readonly client: OAuth2Client,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  authorizationUrl(state: string, nonce: string, challenge: string): string {
    return this.client.generateAuthUrl({
      response_type: 'code',
      scope: ['openid', 'email', 'profile'],
      access_type: 'online',
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: CodeChallengeMethod.S256,
    });
  }

  async verify(code: string, nonce: string, codeVerifier: string): Promise<VerifiedGoogleIdentity> {
    const idToken = await this.exchangeCode(code, codeVerifier);
    this.validateTokenHeader(idToken);
    const certificates = await this.signingCertificates();
    return this.verifyIdentity(idToken, certificates.certs, nonce);
  }

  private async exchangeCode(code: string, codeVerifier: string): Promise<string> {
    try {
      const { tokens } = await this.client.getToken({ code, codeVerifier });
      if (typeof tokens.id_token !== 'string' || !tokens.id_token)
        throw authenticationFailed();
      // Never call setCredentials, subscribe to tokens, or persist provider tokens.
      return tokens.id_token;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 400 || status === 401) throw authenticationFailed();
      throw providerUnavailable();
    }
  }

  private validateTokenHeader(idToken: string): void {
    // Restrict the Google signing algorithm before passing the JWT to the
    // official verifier. Library diagnostics can contain tokens; never log them.
    try {
      const header = JSON.parse(
        Buffer.from(idToken.split('.')[0], 'base64url').toString('utf8'),
      );
      if (
        header.alg !== 'RS256' ||
        typeof header.kid !== 'string' ||
        !header.kid
      )
        throw authenticationFailed();
    } catch {
      throw authenticationFailed();
    }
  }

  private async signingCertificates(): Promise<SigningCertificates> {
    try {
      return await this.client.getFederatedSignonCertsAsync();
    } catch {
      throw providerUnavailable();
    }
  }

  private async verifyIdentity(
    idToken: string,
    certificates: SigningCertificates['certs'],
    nonce: string,
  ): Promise<VerifiedGoogleIdentity> {
    try {
      const clientId = this.config.getOrThrow<string>('runtime.googleClientId');
      const ticket = await this.client.verifySignedJwtWithCertsAsync(
        idToken,
        certificates,
        clientId,
        ['https://accounts.google.com', 'accounts.google.com'],
      );
      const claims = claimsSchema.parse(ticket.getPayload());
      const now = Date.now() / 1000;
      // The library allows five minutes of clock skew. Do not accept an already
      // expired token, non-numeric dates, or an inconsistent authorized party.
      if (!validClaims(claims, nonce, clientId, now)) {
        throw authenticationFailed();
      }
      return mapIdentity(claims);
    } catch {
      throw authenticationFailed();
    }
  }
}
