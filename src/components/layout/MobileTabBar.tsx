"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_TAB_ITEMS } from "@/lib/nav";

const ICONS: Record<string, React.ReactNode> = {
  Dashboard: (
    <path d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  ),
  Explore: <circle cx="11" cy="11" r="7" strokeWidth="1.6" />,
  Screener: <path d="M4 5h16M7 12h10M10 19h4" strokeWidth="1.6" strokeLinecap="round" />,
  Watchlist: (
    <path
      d="M12 4.5 14.5 9.6l5.6.8-4.05 3.95.96 5.6L12 17.3l-5.01 2.65.96-5.6L3.9 10.4l5.6-.8L12 4.5Z"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  ),
  Portfolio: (
    <path d="M4 7h16v12H4z M4 7l3-3h10l3 3" strokeWidth="1.6" strokeLinejoin="round" />
  ),
};

export default function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur sm:hidden">
      <ul className="flex items-stretch justify-between px-1">
        {MOBILE_TAB_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                  {ICONS[item.label]}
                </svg>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
