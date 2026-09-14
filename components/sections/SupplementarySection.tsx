"use client";

import { useStockData } from "@/lib/hooks/useStockData";

/** 补充实验(论文§4.7):单/双变量抽样属性、随机森林先验变体、两阶段协议。 */
export function SupplementarySection() {
  const { supplementary, loading } = useStockData();

  if (loading || !supplementary) {
    return <div className="p-8 text-center text-stone-500">Loading supplementary experiments…</div>;
  }
  const { samplingAttribute, rfVariant, twoStage } = supplementary;
  const rfAt = (design: string, n: number) =>
    rfVariant.find((r) => r.design === design && r.n === n)?.rmseMean;

  return (
    <section className="space-y-6">
      <h2 className="font-serif text-2xl font-bold text-stone-900">Supplementary experiments</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-stone-300 bg-white p-5">
          <h3 className="font-serif text-base font-semibold text-stone-900">
            Bivariate beats univariate matching
          </h3>
          <p className="mt-2 text-sm text-stone-600">
            Histogram matching on NDVI alone pays a price: aligning sampling with the full feature
            space of the downstream model (NDVI + NIRv) lowers E4 mapping RMSE by a further 18% at
            n = 27 (12.55 vs 14.86 t C/ha).
          </p>
          <table className="mt-3 w-full text-xs">
            <thead className="bg-stone-100 text-left text-stone-600">
              <tr>
                <th className="p-2">n</th>
                <th className="p-2">NDVI only</th>
                <th className="p-2">Bivariate</th>
              </tr>
            </thead>
            <tbody>
              {samplingAttribute.map((r) => (
                <tr key={r.n} className="border-t border-stone-200">
                  <td className="p-2 font-medium">{r.n}</td>
                  <td className="p-2">{r.ndviOnly.toFixed(2)}</td>
                  <td className="p-2 font-semibold text-emerald-800">{r.bivariate.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border border-stone-300 bg-white p-5">
          <h3 className="font-serif text-base font-semibold text-stone-900">
            Random-forest prior variant
          </h3>
          <p className="mt-2 text-sm text-stone-600">
            Swapping E1&apos;s quadratic polynomial for a random forest (same two 2024 indices)
            changes little — the SMP gains come from sampling, not from the prior&apos;s exact
            functional form.
          </p>
          <table className="mt-3 w-full text-xs">
            <thead className="bg-stone-100 text-left text-stone-600">
              <tr>
                <th className="p-2">n</th>
                <th className="p-2">SMP (RF)</th>
                <th className="p-2">Zone random (RF)</th>
              </tr>
            </thead>
            <tbody>
              {[27, 54, 90].map((n) => (
                <tr key={n} className="border-t border-stone-200">
                  <td className="p-2 font-medium">{n}</td>
                  <td className="p-2">{rfAt("SMP-cLHS", n)?.toFixed(2) ?? "—"}</td>
                  <td className="p-2">{rfAt("Zone random", n)?.toFixed(2) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border border-stone-300 bg-white p-5">
          <h3 className="font-serif text-base font-semibold text-stone-900">Two-stage protocol</h3>
          <p className="mt-2 text-sm text-stone-600">
            Under SMP at n = {twoStage.n}, adding {twoStage.calibrationSize} calibration plots (the
            calibration set fits the prior and covariance parameters once, disjoint from the
            monitoring set) moves RMSE from {twoStage.singleStageRmse.toFixed(2)} ±{" "}
            {twoStage.singleStageSd.toFixed(2)} to {twoStage.twoStageRmse.toFixed(2)} ±{" "}
            {twoStage.twoStageSd.toFixed(2)} — a {twoStage.gainPct}% gain with smaller variance.
            Single-stage is already workable for mapping; an independent calibration set pays when
            the budget allows pursuing precision or stability.
          </p>
        </div>
      </div>
    </section>
  );
}
