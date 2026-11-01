// Brand band background shared by the breadcrumb and the home hero: a light
// primary tint with a radial glow at the top. Built from tokens, so it follows
// the theme without a dark variant.
export const BRAND_BAND_BACKGROUND = [
  'radial-gradient(ellipse 70% 120% at 50% 0%, color-mix(in oklab, var(--primary) 24%, transparent), transparent 70%)',
  'linear-gradient(color-mix(in oklab, var(--primary) 8%, var(--background)), color-mix(in oklab, var(--primary) 8%, var(--background)))',
].join(', ');
