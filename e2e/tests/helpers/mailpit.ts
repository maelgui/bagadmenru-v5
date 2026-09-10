import { request } from '@playwright/test';
import { randomUUID } from 'node:crypto';

import { CORRELATION_ID_HEADER } from './constants';

// Base URL of the Mailpit HTTP API. Two shapes are supported:
//  - a bare origin (CI port-forwards Mailpit to localhost:8025), and
//  - an origin + path prefix, e.g. http://localhost:5173/mailpit, used by the
//    local docker/finch compose stack where Mailpit has no published host port
//    and is reached through the vite proxy (MP_WEBROOT=mailpit).
// We therefore build request URLs by concatenating this base with the API path
// rather than using Playwright's `baseURL` (which drops any path prefix when
// the request path is absolute like `/api/...`).
const MAILPIT_URL = (process.env.MAILPIT_URL || 'http://localhost:8025').replace(/\/$/, '');

/** Build an absolute Mailpit API URL, preserving any base path prefix. */
function mailpitUrl(path: string): string {
  return `${MAILPIT_URL}${path}`;
}

export interface MailpitMessage {
  ID: string;
  From: { Name: string; Address: string };
  To: { Name: string; Address: string }[];
  Subject: string;
  Snippet: string;
  Created: string;
}

export interface MailpitMessageDetail extends MailpitMessage {
  Text: string;
  HTML: string;
}

/**
 * Wait for an email matching the given criteria.
 * Polls mailpit every 500ms until found or timeout.
 *
 * Mailpit is a shared mailbox: when several emails match (e.g. two tests use
 * the same recipient), we deliberately return the *most recent* one — sorted
 * by `Created` descending — so a test picks up the email it just triggered
 * rather than a stale one left by another spec. Callers that need exact
 * request→email correlation should prefer `waitForEmailByCorrelationId`.
 */
export async function waitForEmail(
  to: string,
  options?: { subject?: string; timeout?: number }
): Promise<MailpitMessageDetail> {
  const timeout = options?.timeout || 10_000;
  const start = Date.now();

  const ctx = await request.newContext();

  while (Date.now() - start < timeout) {
    const res = await ctx.get(mailpitUrl(`/api/v1/search?query=to:${to}`));
    const data = await res.json();

    if (data.messages && data.messages.length > 0) {
      const messages: MailpitMessage[] = [...data.messages].sort(
        (a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime()
      );

      // Filter by subject if specified, taking the most recent match.
      const match = options?.subject
        ? messages.find((m) => m.Subject.includes(options.subject!))
        : messages[0];

      if (match) {
        // Fetch full message with HTML/Text body
        const detail = await ctx.get(mailpitUrl(`/api/v1/message/${match.ID}`));
        const result = await detail.json();
        await ctx.dispose();
        return result;
      }
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  await ctx.dispose();
  throw new Error(`Timeout waiting for email to ${to} (${timeout}ms)`);
}

/**
 * Generate a fresh correlation ID for a test.
 *
 * The value must satisfy the backend's strict format
 * (^[A-Za-z0-9._-]{8,64}$, see backend/bbe2/utils/correlation.py) so the
 * backend trusts and echoes it back rather than replacing it. A bare UUID hex
 * (32 chars, [a-f0-9]) qualifies; we prefix it to make test-originated IDs
 * easy to spot in logs.
 */
export function newCorrelationId(prefix = 'e2e'): string {
  return `${prefix}-${randomUUID().replace(/-/g, '')}`;
}

/**
 * Fetch all headers of a message as a case-insensitive lookup.
 * Mailpit returns headers as { "Header-Name": ["value", ...] }.
 */
async function getMessageHeaders(
  ctx: Awaited<ReturnType<typeof request.newContext>>,
  id: string
): Promise<Record<string, string[]>> {
  const res = await ctx.get(mailpitUrl(`/api/v1/message/${id}/headers`));
  if (!res.ok()) return {};
  const raw = (await res.json()) as Record<string, string[]>;
  const lower: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    lower[key.toLowerCase()] = value;
  }
  return lower;
}

/**
 * Wait for the email carrying a specific correlation ID.
 *
 * This is the robust way to locate the exact email a request produced: the
 * test sends `X-Correlation-ID: <id>` on the request that triggers the email,
 * and the backend stamps the same header on the outgoing message. We poll
 * Mailpit, then read each candidate's headers (Mailpit does not index custom
 * headers for its text search, so we must fetch them) and match on the ID.
 *
 * Optionally narrow candidates by recipient with `to` to reduce header reads.
 */
export async function waitForEmailByCorrelationId(
  correlationId: string,
  options?: { to?: string; timeout?: number }
): Promise<MailpitMessageDetail> {
  const timeout = options?.timeout || 15_000;
  const start = Date.now();
  const target = correlationId.toLowerCase();
  const headerKey = CORRELATION_ID_HEADER.toLowerCase();

  const ctx = await request.newContext();

  // Under full-parallel runs several specs share one Mailpit inbox and issue
  // deletes concurrently, so a list/detail response can transiently be non-OK
  // or non-JSON. Tolerate that and keep polling rather than throwing.
  const safeJson = async (res: Awaited<ReturnType<typeof ctx.get>>): Promise<any | null> => {
    if (!res.ok()) return null;
    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  try {
    while (Date.now() - start < timeout) {
      const query = options?.to ? `to:${options.to}` : '';
      const res = query
        ? await ctx.get(mailpitUrl(`/api/v1/search?query=${encodeURIComponent(query)}`))
        : await ctx.get(mailpitUrl('/api/v1/messages'));
      const data = await safeJson(res);
      const messages: MailpitMessage[] = data?.messages || [];

      for (const msg of messages) {
        const headers = await getMessageHeaders(ctx, msg.ID);
        const values = headers[headerKey] || [];
        if (values.some((v) => v.toLowerCase() === target)) {
          const detail = await ctx.get(mailpitUrl(`/api/v1/message/${msg.ID}`));
          const body = await safeJson(detail);
          if (body) return body as MailpitMessageDetail;
        }
      }

      await new Promise((r) => setTimeout(r, 500));
    }
  } finally {
    await ctx.dispose();
  }

  throw new Error(
    `Timeout waiting for email with ${CORRELATION_ID_HEADER}=${correlationId} (${timeout}ms)`
  );
}

/**
 * Extract all links from an email's HTML body.
 */
export function extractLinks(html: string): string[] {
  const matches = html.matchAll(/href="([^"]+)"/g);
  return [...matches].map((m) => m[1]);
}

/**
 * Delete a specific email by ID.
 *
 * Deletion is always scoped to a single message: tests must never clear the
 * whole inbox, because Mailpit is a shared mailbox and, under parallel runs,
 * a global purge would delete emails other specs are still waiting for. Each
 * test locates the exact email it produced (by correlation ID, unique
 * recipient, or — as a last resort — the latest match) and removes only that.
 */
export async function deleteEmail(id: string): Promise<void> {
  const ctx = await request.newContext();
  await ctx.delete(mailpitUrl('/api/v1/messages'), {
    data: { IDs: [id] },
  });
  await ctx.dispose();
}
