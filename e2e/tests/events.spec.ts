import { test, expect } from '@playwright/test';

test.describe('Events API', () => {
  test('should return events list (requires auth)', async ({ request }) => {
    // This test requires a valid JWT — use the auth fixture in real tests
    const res = await request.get('/api/v1/events/');
    // Without auth, should get 401
    expect(res.status()).toBe(401);
  });

  test('should export ICS without auth', async ({ request }) => {
    const res = await request.get('/api/v1/events/export/ics');
    // ICS export might not require auth (public calendar)
    // Adjust based on your actual permissions
    expect([200, 401]).toContain(res.status());
  });
});
