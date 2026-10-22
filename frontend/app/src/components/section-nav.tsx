import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface SectionNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Vertical list of sub-route links for a sectioned area (settings, admin). It
 * stacks full-width above the content on mobile and becomes the sticky sidebar
 * column on desktop (see `SectionLayout`).
 */
export function SectionNav({ items, label }: { items: SectionNavItem[]; label: string }) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-col gap-1">
        {items.map(({ to, label: itemLabel, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors',
                'hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                isActive ? 'bg-muted text-primary' : 'text-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {itemLabel}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Sidebar (desktop) / stacked (mobile) two-column shell around a SectionNav. */
export function SectionLayout({ nav, children }: { nav: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <div className="lg:w-64 lg:shrink-0">
        <div className="lg:sticky lg:top-6">{nav}</div>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
