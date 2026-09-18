export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "Explore", href: "/explore" },
  { label: "Managers", href: "/managers" },
  { label: "High Yield", href: "/high-yield" },
  { label: "Weekly Income", href: "/weekly-income" },
  { label: "Monthly Income", href: "/monthly-income" },
  { label: "Dividend Calendar", href: "/calendar" },
  { label: "Content Engine", href: "/content" },
  { label: "Compare", href: "/compare" },
  { label: "Watchlist", href: "/watchlist" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Alerts", href: "/alerts" },
  { label: "Education", href: "/education" },
];

export const MOBILE_TAB_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "Explore", href: "/explore" },
  { label: "Screener", href: "/screener" },
  { label: "Watchlist", href: "/watchlist" },
  { label: "Portfolio", href: "/portfolio" },
];
