/**
 * Pure helpers turning DOM and router facts into audit event labels.
 */

/** Elements whose activation counts as a click worth auditing. */
const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  'summary',
  'input[type="submit"]',
  'input[type="button"]',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="tab"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="option"]',
].join(', ');

const MAX_LABEL_LENGTH = 80;

export interface ClickDescription {
  name: string;
  details: Record<string, unknown>;
}

function accessibleName(element: Element): string {
  const explicit = element.getAttribute('aria-label');
  if (explicit?.trim()) return explicit.trim();
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => element.ownerDocument.getElementById(id)?.textContent.trim() ?? '')
      .filter(Boolean)
      .join(' ');
    if (text) return text;
  }
  const title = element.getAttribute('title');
  const text = element.textContent.replace(/\s+/g, ' ').trim();
  return text || title?.trim() || '';
}

function linkHref(element: Element): string | null {
  return element instanceof HTMLAnchorElement ? element.getAttribute('href') : null;
}

/**
 * Describe the interactive element behind a click, or null when the click hit
 * nothing interactive (plain text, a card background...).
 *
 * The name is, in order: an explicit `data-audit` id (for buttons whose label
 * is ambiguous or user-specific), the accessible name, else the tag. Only
 * labels are read, never form values.
 */
export function describeClickTarget(target: EventTarget | null): ClickDescription | null {
  if (!(target instanceof Element)) return null;
  const element = target.closest(INTERACTIVE_SELECTOR);
  if (!element) return null;

  const tag = element.tagName.toLowerCase();
  const auditId = element.getAttribute('data-audit')?.trim();
  const label = accessibleName(element).slice(0, MAX_LABEL_LENGTH);
  const details: Record<string, unknown> = { tag };
  const role = element.getAttribute('role');
  if (role) details.role = role;
  if (auditId && label) details.label = label;
  const href = linkHref(element);
  if (href) details.href = href;
  return { name: auditId || label || tag, details };
}

/**
 * Rebuild the route pattern from a concrete pathname and the matched params:
 * `/profile/abc` + `{ profileId: 'abc' }` gives `/profile/:profileId`.
 * Segments are compared whole, so a param value also present inside another
 * segment is left alone.
 */
export function routePattern(pathname: string, params: Record<string, string | undefined>): string {
  const byValue = new Map<string, string>();
  for (const [name, value] of Object.entries(params)) {
    if (value) byValue.set(value, name);
  }
  return pathname
    .split('/')
    .map((segment) => {
      const name = byValue.get(decodeURIComponent(segment));
      return name ? `:${name}` : segment;
    })
    .join('/');
}
