import { currentSessionResponseSchema } from './current-session.schema';

const user = {
  id: '3eac11b0-884a-4f50-a593-28bd8663387a',
  email: 'session@example.test',
  displayName: 'Synthetic User',
};

describe('current-session schema', () => {
  it.each(['pending', 'active'])('accepts %s access with a public identity', (status) => {
    expect(currentSessionResponseSchema.parse({ status, user })).toEqual({ status, user });
  });

  it.each([
    { status: 'anonymous' },
    { status: 'active' },
    { status: 'active', user: { ...user, id: 'invalid' } },
    { status: 'active', user: { ...user, email: 'invalid' } },
    { status: 'active', user: { ...user, displayName: '   ' } },
  ])('rejects an invalid or anonymous successful response: %j', (response) => {
    expect(currentSessionResponseSchema.safeParse(response).success).toBe(false);
  });
});
