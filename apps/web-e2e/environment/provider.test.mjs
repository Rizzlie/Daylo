import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createProvider } from './provider.mjs';
import { close, listen } from './process.mjs';

test('provider enforces PKCE, callback allowlist and single-use codes', async () => {
  const config = { clientId: 'synthetic-client', clientSecret: 'synthetic-secret', callback: 'http://127.0.0.1:12345/api/auth/google/callback' };
  const server = createProvider(config);
  try {
    const origin = await listen(server);
    const verifier = 'a'.repeat(43);
    const params = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.callback,
      response_type: 'code', code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      nonce: 'synthetic-nonce', state: 'synthetic-state', account: 'owner' });
    const invalid = new URLSearchParams(params);
    invalid.set('redirect_uri', 'https://unapproved.example.test');
    assert.equal((await fetch(`${origin}/authorize?${invalid}`, { redirect: 'manual' })).status, 400);
    async function code() {
      const response = await fetch(`${origin}/authorize?${params}`, { redirect: 'manual' });
      assert.equal(response.status, 302);
      return new URL(response.headers.get('location')).searchParams.get('code');
    }
    function exchange(code, codeVerifier) {
      return fetch(`${origin}/token`, { method: 'POST', body: new URLSearchParams({ code, code_verifier: codeVerifier,
        client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.callback, grant_type: 'authorization_code' }) });
    }
    const rejected = await code();
    assert.equal((await exchange(rejected, 'wrong')).status, 400);
    assert.equal((await exchange(rejected, verifier)).status, 400);
    const accepted = await code();
    const token = await exchange(accepted, verifier);
    assert.equal(token.status, 200);
    assert.match((await token.json()).id_token, /^[\w-]+\.[\w-]+\.[\w-]+$/);
    assert.equal((await exchange(accepted, verifier)).status, 400);
  } finally { await close(server); }
});
