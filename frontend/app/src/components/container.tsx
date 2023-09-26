import { ReactNode } from 'react';

export default function Container(
  { className = undefined, children }: { className?: string, children: ReactNode },
) {
  return (
    <div className={`container mx-auto p-4 ${className || ''}`}>{children}</div>
  );
}
