import { ResponseError } from 'bagad-client';
import { z } from 'zod';

const detailSchema = z.object({ detail: z.string() });

/**
 * Safely extract a human-readable message from a caught error.
 *
 * For a FastAPI ``ResponseError`` we read the ``detail`` field from the JSON
 * body when present; otherwise we fall back to the provided default.
 */
export async function extractErrorMessage(
  error: unknown,
  fallback: string,
): Promise<string> {
  if (error instanceof ResponseError) {
    try {
      const parsed = detailSchema.safeParse(await error.response.json());
      if (parsed.success) return parsed.data.detail;
    } catch {
      // Body was not JSON / not the expected shape; use the fallback.
    }
  }
  return fallback;
}
