import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-border pb-20 pt-8 sm:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="card p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-caution">
            Important
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            <li>Distribution yield is not the same as investment return.</li>
            <li>Past distributions do not guarantee future distributions.</li>
            <li>
              High distribution rates can involve substantial risk and may include Return of
              Capital.
            </li>
            <li>Some option-income strategies can sacrifice upside participation.</li>
            <li>Highest yield ≠ best investment. YieldIQ never ranks funds by yield alone.</li>
          </ul>
        </div>
        <div className="mt-6 flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            YIELDIQ is an independent research tool. Nothing on this site is investment,
            tax, or legal advice.{" "}
            <Link href="/education" className="text-accent hover:underline">
              Learn the terms
            </Link>
            .
          </p>
          <p>&copy; {new Date().getFullYear()} YieldIQ</p>
        </div>
      </div>
    </footer>
  );
}
