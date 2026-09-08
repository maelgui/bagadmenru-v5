// A soft, colour-coded group pill: the group's colour is used as a translucent
// tint (via color-mix) rather than a solid fill, keeping the tag readable and
// unobtrusive. Shared between the member list (trombinoscope) and the single
// profile page so both surfaces render group tags identically.
export function GroupTag({ name, color }: { name: string; color: string | undefined }) {
  return (
    <span
      className="m-1 inline-block rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground"
      style={color ? {
        backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
        color: `color-mix(in oklab, ${color} 55%, var(--foreground))`,
      } : undefined}
    >
      {name}
    </span>
  );
}
