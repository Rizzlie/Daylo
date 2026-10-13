import { expect, type APIRequestContext } from '@playwright/test';

// Real-stack tests share the local proxy's peer IP. Wait for actual quota
// recovery rather than disabling production protection for automated tests.
export async function waitForApiBudget(request: APIRequestContext): Promise<void> {
  await expect.poll(async () => {
    const response = await request.get('/api/health/ready');
    const headers = response.headers();
    return response.status() === 200 &&
      Number(headers['x-ratelimit-remaining-burst']) >= 15 &&
      Number(headers['x-ratelimit-remaining-minute']) >= 15;
  }, { timeout: 75_000, intervals: [1000, 10_000] }).toBe(true);
}
