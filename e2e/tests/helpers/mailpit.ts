import { request } from '@playwright/test';

const MAILPIT_URL = process.env.MAILPIT_URL || 'http://localhost:8025';

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
 */
export async function waitForEmail(
  to: string,
  options?: { subject?: string; timeout?: number }
): Promise<MailpitMessageDetail> {
  const timeout = options?.timeout || 10_000;
  const start = Date.now();

  const ctx = await request.newContext({ baseURL: MAILPIT_URL });

  while (Date.now() - start < timeout) {
    const res = await ctx.get(`/api/v1/search?query=to:${to}`);
    const data = await res.json();

    if (data.messages && data.messages.length > 0) {
      const messages: MailpitMessage[] = data.messages;

      // Filter by subject if specified
      const match = options?.subject
        ? messages.find((m) => m.Subject.includes(options.subject!))
        : messages[0];

      if (match) {
        // Fetch full message with HTML/Text body
        const detail = await ctx.get(`/api/v1/message/${match.ID}`);
        await ctx.dispose();
        return await detail.json();
      }
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  await ctx.dispose();
  throw new Error(`Timeout waiting for email to ${to} (${timeout}ms)`);
}

/**
 * Extract all links from an email's HTML body.
 */
export function extractLinks(html: string): string[] {
  const matches = html.matchAll(/href="([^"]+)"/g);
  return [...matches].map((m) => m[1]);
}

/**
 * Delete all emails in mailpit (useful for test cleanup).
 */
export async function deleteAllEmails(): Promise<void> {
  const ctx = await request.newContext({ baseURL: MAILPIT_URL });
  await ctx.delete('/api/v1/messages');
  await ctx.dispose();
}
