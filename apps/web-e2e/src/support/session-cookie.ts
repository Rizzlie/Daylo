// Playwright derives Secure from the supplied URL when injecting cookies. Use
// a secure source URL for __Host- fixtures; Chromium sends these cookies to the
// trustworthy loopback test origin, just as it does for real API Set-Cookie.
export function syntheticSessionCookie(baseUrl: string, token: string) {
  const source = new URL(baseUrl);
  source.protocol = 'https:';
  return { name: '__Host-daylo_session', value: token, url: source.href,
    httpOnly: true, secure: true, sameSite: 'Lax' as const };
}
