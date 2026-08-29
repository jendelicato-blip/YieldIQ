import Link from "next/link";
import SearchBar from "./SearchBar";
import DesktopNav from "./DesktopNav";
import MobileTabBar from "./MobileTabBar";

export default function Header() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex flex-col leading-none shrink-0">
              <span className="text-xl font-bold tracking-tight text-foreground">
                YIELD<span className="text-accent">IQ</span>
              </span>
              <span className="mt-0.5 hidden text-[11px] font-medium tracking-wide text-muted sm:block">
                Know the Yield. Understand the Risk. Grow the Income.
              </span>
            </Link>
            <div className="hidden flex-1 justify-center sm:flex">
              <SearchBar />
            </div>
            <Link
              href="/education"
              className="hidden shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:border-accent/50 sm:block"
            >
              Learn
            </Link>
          </div>
          <div className="sm:hidden">
            <SearchBar compact />
          </div>
          <DesktopNav />
        </div>
      </header>
      <MobileTabBar />
    </>
  );
}
