'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS: { href: string; label: string; color?: string }[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/hedge', label: 'H — Hedge', color: 'text-blue-400' },
  { href: '/edge', label: 'E — Edge', color: 'text-accent' },
  { href: '/asymmetry', label: 'A — Asymmetry', color: 'text-yellow' },
  { href: '/theme', label: 'T — Theme', color: 'text-green' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-card-border bg-card">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 h-14">
        <Link
          href="/"
          className="font-bold text-lg text-accent mr-6 tracking-tight"
        >
          H.E.A.T.
        </Link>
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                active
                  ? `bg-background ${tab.color ?? 'text-foreground'}`
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
