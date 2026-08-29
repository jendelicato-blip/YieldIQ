"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";

export default function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden overflow-x-auto sm:block">
      <ul className="flex items-center gap-1 text-sm">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`inline-block rounded-full px-3 py-1.5 whitespace-nowrap transition-colors ${
                  active
                    ? "bg-accent/15 text-accent font-semibold"
                    : "text-muted hover:text-foreground hover:bg-surface-2"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
