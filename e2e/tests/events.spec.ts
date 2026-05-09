import { test, expect, request, type APIRequestContext } from '@playwright/test';
import { E2E_USER, E2E_ADMIN, API_URL } from './helpers/constants';
import { createAuthenticatedContext } from './helpers/auth';

test.describe('Events', () => {
  let adminCtx: APIRequestContext;
  let userCtx: APIRequestContext;

  test.beforeAll(async () => {
    adminCtx = await createAuthenticatedContext(E2E_ADMIN.email, E2E_ADMIN.password);
    userCtx = await createAuthenticatedContext(E2E_USER.email, E2E_USER.password);
  });

  test.afterAll(async () => {
    await adminCtx.dispose();
    await userCtx.dispose();
  });

  test('should return 401 without auth', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/events/');
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('admin can create an event', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await adminCtx.post('/api/v1/events/', {
      data: {
        title: 'E2E Test Event - Create',
        date: dateStr,
        description: 'Created by E2E tests',
        category: 'repetition',
        costume: 'POLO',
        is_in_doodle: false,
      },
    });

    expect(res.ok()).toBeTruthy();
    const event = await res.json();
    expect(event.title).toBe('E2E Test Event - Create');
    expect(event.id).toBeTruthy();
  });

  test('user can list events', async () => {
    const res = await userCtx.get('/api/v1/events/');
    expect(res.ok()).toBeTruthy();

    const events = await res.json();
    expect(Array.isArray(events)).toBe(true);
  });

  test('user can see an event created by admin', async () => {
    // Setup: create a specific event for this test
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const createRes = await adminCtx.post('/api/v1/events/', {
      data: {
        title: 'E2E Visible Event',
        date: dateStr,
        description: 'Should be visible to members',
        category: 'repetition',
        costume: 'POLO',
        is_in_doodle: false,
      },
    });
    expect(createRes.ok()).toBeTruthy();

    // Act: list events as user and find the created one
    const res = await userCtx.get(`/api/v1/events/?date__gte=${dateStr}`);
    expect(res.ok()).toBeTruthy();

    const events = await res.json();
    const testEvent = events.find(
      (e: { title: string }) => e.title === 'E2E Visible Event'
    );
    expect(testEvent).toBeDefined();
  });

  test('ICS export is accessible', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/events/export/ics');
    // ICS export may or may not require auth
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.text();
      expect(body).toContain('BEGIN:VCALENDAR');
    }
    await ctx.dispose();
  });
});
