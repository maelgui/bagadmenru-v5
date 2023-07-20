type BadgeProps = {
  children: React.ReactNode;
};

export default function Badge({ children }: BadgeProps) {
  return (
    <span className="uppercase font-semibold bg-pourpre-100  rounded-sm text-xs px-2 py-1">{children}</span>
  );
}
