// Signature pastel sweep used by the breadcrumb band and the home hero; the
// dark variant keeps the same hues at low lightness so it blends with the
// dark background.
const LIGHT = 'linear-gradient(to right, #ffe3f3, #f5e0f8, #e7dffd, #d5dfff, #c1dfff)';
const DARK = 'linear-gradient(to right, #3a1226, #331336, #241640, #16203f, #102a3a)';

export function brandGradient(isDark: boolean): string {
  return isDark ? DARK : LIGHT;
}
