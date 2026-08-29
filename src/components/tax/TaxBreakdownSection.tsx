import type { FundDistribution } from "@/lib/types";
import type { NavAnalysis } from "@/lib/performance";
import { deriveTaxProfile, taxProfileToRows, computeRocWarning, TAX_DISCLAIMER } from "@/lib/tax";
import { formatDate } from "@/lib/format";
import TaxClassificationChart from "./TaxClassificationChart";
import RocWarningBanner from "./RocWarningBanner";
import DistinctionBanner from "@/components/ui/DistinctionBanner";
import Link from "next/link";

export default function TaxBreakdownSection({
  ticker,
  distributions,
  navAnalysis,
  avgRocPct,
}: {
  ticker: string;
  distributions: FundDistribution[];
  navAnalysis: NavAnalysis;
  avgRocPct: number | null;
}) {
  const profile = deriveTaxProfile(ticker, distributions);
  const rocWarning = computeRocWarning(avgRocPct, navAnalysis);

  return (
    <div className="space-y-6">
      <DistinctionBanner />

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">Tax Breakdown</p>
          {profile?.classification_status && (
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${
                profile.classification_status === "final"
                  ? "bg-positive/15 text-positive"
                  : "bg-caution/15 text-caution"
              }`}
            >
              {profile.classification_status === "final" ? "FINAL" : "ESTIMATED"}
              {profile.tax_year ? ` · ${profile.tax_year}` : ""}
            </span>
          )}
        </div>

        {profile ? (
          <>
            <p className="mt-1 text-xs text-muted">
              Most recently reported classification, from the distribution paid{" "}
              {formatDate(profile.as_of_ex_date)}.
            </p>
            <div className="mt-4">
              <TaxClassificationChart rows={taxProfileToRows(profile)} />
            </div>
            {(profile.short_term_capital_gains_pct != null || profile.long_term_capital_gains_pct != null) && (
              <p className="mt-3 text-xs text-muted">
                Of the capital gains portion:{" "}
                {profile.short_term_capital_gains_pct != null && (
                  <>Short-term {profile.short_term_capital_gains_pct.toFixed(0)}%</>
                )}
                {profile.short_term_capital_gains_pct != null && profile.long_term_capital_gains_pct != null && " · "}
                {profile.long_term_capital_gains_pct != null && (
                  <>Long-term {profile.long_term_capital_gains_pct.toFixed(0)}%</>
                )}
              </p>
            )}
            <p className="mt-3 text-[11px] text-muted">
              Source: {profile.data_source ?? profile.classification_source ?? "Fund tax reporting"}
              {profile.classification_status !== "final" && (
                <>
                  {" "}
                  — fund distributions may initially be reported with an estimated
                  classification; final tax characterization is generally provided by the fund
                  after the end of the tax year and reflected on your tax reporting documents.
                </>
              )}
            </p>
          </>
        ) : (
          <div className="mt-4 rounded-lg bg-surface-2 p-6 text-center text-sm text-muted">
            Tax classification unavailable — this fund has not yet reported a distribution tax
            characterization to YieldIQ&apos;s verified sources.
          </div>
        )}
      </div>

      <RocWarningBanner warning={rocWarning} />

      <div className="card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Why does this matter?</p>
        <p className="mt-2 text-sm text-muted">
          A fund can advertise a very high distribution rate, but that does not mean the entire
          distribution is taxable income or that the investment earned that amount.
          Understanding the difference between distribution yield, total return, Return of
          Capital, and taxable income is essential when evaluating high-income ETFs.
        </p>
        <Link href="/education#tax" className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
          Read the full Tax Analysis guide →
        </Link>
      </div>

      <div className="card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Taxable vs. Tax-Advantaged Accounts</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-surface-2 p-3 text-sm">
            <p className="font-semibold">Taxable Brokerage</p>
            <p className="mt-1 text-xs text-muted">
              ROC, Ordinary Income, Qualified Dividends, and Capital Gains may generally each be
              treated differently for tax purposes, as described above.
            </p>
          </div>
          <div className="rounded-lg bg-surface-2 p-3 text-sm">
            <p className="font-semibold">Tax-Advantaged Account (e.g. Traditional or Roth IRA)</p>
            <p className="mt-1 text-xs text-muted">
              Distributions generally have different tax implications inside accounts like
              Traditional or Roth IRAs. This is not personalized tax advice — consult a
              qualified professional about your account type.
            </p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted">{TAX_DISCLAIMER}</p>
    </div>
  );
}
