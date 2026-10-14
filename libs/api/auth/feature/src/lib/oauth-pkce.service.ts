import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticationFailed } from './google-oidc.provider';

export interface PkceBinding {
  stateHash: string;
  browserBindingHash: string;
  nonce: string;
}

const associatedData = (binding: PkceBinding) => Buffer.from(JSON.stringify([
  'daylo:oauth-pkce:v1', binding.stateHash, binding.browserBindingHash, binding.nonce,
]));

function decodeVerifier(encryptedVerifier: string | null) {
  // Fixed lengths and canonical base64url reject legacy or malformed records.
  if (!encryptedVerifier || !/^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{58}\.[A-Za-z0-9_-]{22}$/.test(encryptedVerifier)) {
    throw authenticationFailed();
  }
  const encoded = encryptedVerifier.split('.').slice(1);
  const decoded = encoded.map((part) => Buffer.from(part, 'base64url'));
  const isCanonical = decoded.every((value, index) => value.toString('base64url') === encoded[index]);
  if (!isCanonical) throw authenticationFailed();
  const [iv, ciphertext, tag] = decoded;
  return { iv, ciphertext, tag };
}

function encodeVerifier(iv: Buffer, ciphertext: Buffer, tag: Buffer): string {
  return ['v1', ...[iv, ciphertext, tag].map((value) => value.toString('base64url'))].join('.');
}

@Injectable()
export class OAuthPkceService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  create(binding: PkceBinding): { challenge: string; encryptedVerifier: string } {
    const verifier = randomBytes(32).toString('base64url');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    cipher.setAAD(associatedData(binding));
    const ciphertext = Buffer.concat([cipher.update(verifier, 'utf8'), cipher.final()]);
    return {
      challenge: createHash('sha256').update(verifier).digest('base64url'),
      encryptedVerifier: encodeVerifier(iv, ciphertext, cipher.getAuthTag()),
    };
  }

  recover(encryptedVerifier: string | null, binding: PkceBinding): string {
    try {
      const { iv, ciphertext, tag } = decodeVerifier(encryptedVerifier);
      const decipher = createDecipheriv('aes-256-gcm', this.key(), iv);
      decipher.setAAD(associatedData(binding));
      decipher.setAuthTag(tag);
      const verifier = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
      if (!/^[A-Za-z0-9_-]{43}$/.test(verifier)) throw authenticationFailed();
      return verifier;
    } catch {
      // Crypto diagnostics and plaintext must never leave this boundary.
      throw authenticationFailed();
    }
  }

  private key(): Buffer {
    const value = this.config.getOrThrow<string>('runtime.oauthPkceEncryptionKey');
    if (!/^[a-fA-F0-9]{64}$/.test(value)) throw new Error('Invalid OAuth PKCE encryption key');
    return Buffer.from(value, 'hex');
  }
}
