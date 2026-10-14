import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { createServer } from 'node:http';
import { accounts } from './fixtures.mjs';

// Only Google's HTTP surface is replaced. Daylo verifies these RS256 tokens,
// audience/issuer/nonce and encrypted transaction binding using production code.
export function createProvider({ clientId, clientSecret, callback }) {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const codes = new Map();
  function json(response, status, body) {
    response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    response.end(JSON.stringify(body));
  }
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (request.method === 'GET' && url.pathname === '/certs') {
        return json(response, 200, { 'e2e-signing-key': publicKey.export({ type: 'spki', format: 'pem' }) });
      }
      if (request.method === 'GET' && url.pathname === '/authorize') {
        const params = url.searchParams;
        if (params.get('client_id') !== clientId || params.get('redirect_uri') !== callback
          || params.get('response_type') !== 'code' || params.get('code_challenge_method') !== 'S256'
          || !/^[\w-]{43}$/.test(params.get('code_challenge') ?? '')
          || !params.get('state') || !params.get('nonce')) return json(response, 400, { error: 'invalid_request' });
        // A local selection UI avoids test-only Daylo authentication routes.
        const role = params.get('account');
        if (!role) {
          const links = Object.keys(accounts).map((account) => {
            const next = new URLSearchParams(params);
            next.set('account', account);
            const href = `/authorize?${next}`.replaceAll('&', '&amp;');
            return `<li><a href="${href}">${account}</a></li>`;
          }).join('');
          response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
          return response.end(`<!doctype html><html lang="en"><title>E2E identity provider</title><h1>Synthetic Google accounts</h1><ul>${links}</ul></html>`);
        }
        if (!Object.hasOwn(accounts, role)) return json(response, 400, { error: 'invalid_account' });
        for (const [code, record] of codes) if (record.expires < Date.now()) codes.delete(code);
        if (codes.size >= 100) return json(response, 429, { error: 'capacity' });
        const code = randomBytes(32).toString('base64url');
        codes.set(code, { nonce: params.get('nonce'), challenge: params.get('code_challenge'), role, expires: Date.now() + 60_000 });
        const destination = new URL(callback);
        destination.searchParams.set('code', code);
        destination.searchParams.set('state', params.get('state'));
        response.writeHead(302, { location: destination.href, 'cache-control': 'no-store' });
        return response.end();
      }
      if (request.method === 'POST' && url.pathname === '/token') {
        let body = '';
        for await (const chunk of request) {
          body += chunk;
          if (body.length > 8192) { json(response, 413, { error: 'too_large' }); return; }
        }
        const params = new URLSearchParams(body);
        const record = codes.get(params.get('code'));
        codes.delete(params.get('code'));
        if (!record || record.expires < Date.now() || params.get('client_id') !== clientId
          || params.get('client_secret') !== clientSecret || params.get('redirect_uri') !== callback
          || params.get('grant_type') !== 'authorization_code'
          || createHash('sha256').update(params.get('code_verifier') ?? '').digest('base64url') !== record.challenge) {
          return json(response, 400, { error: 'invalid_grant' });
        }
        const account = accounts[record.role];
        const now = Math.floor(Date.now() / 1000);
        const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'e2e-signing-key' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({ iss: 'https://accounts.google.com', aud: clientId,
          sub: account.subject, email: account.email, email_verified: true, hd: 'example.test', name: account.name,
          nonce: record.nonce, iat: now, exp: now + 300 })).toString('base64url');
        const signed = `${header}.${payload}`;
        return json(response, 200, { id_token: `${signed}.${sign('RSA-SHA256', Buffer.from(signed), privateKey).toString('base64url')}`,
          token_type: 'Bearer', expires_in: 300 });
      }
      json(response, 404, { error: 'not_found' });
    } catch { if (!response.headersSent) json(response, 500, { error: 'provider_failure' }); else response.end(); }
  });
}
