"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { GroundTruthData } from "@/lib/types/geo";

export function GroundTruthSection() {
  const [data, setData] = useState<GroundTruthData | null>(null);

  useEffect(() => {
    fetch("/data/ground-truth-dbh.json")
      .then((r) => r.json())
      .then(setData)
      .catch((err) => console.error("[GroundTruthSection] 加载数据失败", err));
  }, []);

  // 英文版只展示2024年这一期(论文§2.2/§7:2018表格系2024数据反推,不构成独立验证证据)
  const rows2024 = data?.lidar_vs_field_validation.filter((r) => r.year === "2024") ?? [];

  return (
    <section className="space-y-6">
      <h2 className="font-serif text-2xl font-bold text-stone-900">Ground-truth validation</h2>

      <div>
        <h3 className="font-serif text-lg font-semibold text-stone-900">
          LiDAR vs field measurement: the direct check required by CCER
        </h3>
        <p className="mt-1 text-sm text-stone-600">
          101 field-measured trees (girth converted to DBH, GPS-recorded) were matched to LiDAR
          tree crowns by geometric overlap (IoU &gt; 0.5); LiDAR-estimated DBH is compared against
          the field value.
        </p>
        {rows2024.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-md border border-stone-300 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-left text-stone-600">
                <tr>
                  <th className="p-3">Year</th>
                  <th className="p-3">Matched trees n</th>
                  <th className="p-3">RMSE (cm)</th>
                  <th className="p-3">Relative RMSE (%)</th>
                  <th className="p-3">R²</th>
                  <th className="p-3">CCER Table 35 verdict</th>
                </tr>
              </thead>
              <tbody>
                {rows2024.map((r) => (
                  <tr key={r.year} className="border-t border-stone-200">
                    <td className="p-3 font-medium">{r.year}</td>
                    <td className="p-3">{r.n}</td>
                    <td className="p-3">{r.rmse.toFixed(2)}</td>
                    <td className="p-3 font-semibold text-emerald-800">{r.rrmse.toFixed(2)}%</td>
                    <td className="p-3">{r.r2.toFixed(3)}</td>
                    <td className="p-3">{r.rrmse <= 10 ? "≤10%, no deduction" : "Deduction applies"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-serif text-lg font-semibold text-stone-900">
          Auxiliary: cross-validation of the DBH conversion formula itself (height + crown → DBH)
        </h3>
        <p className="mt-1 text-sm text-stone-600">
          The following compares four candidate conversion formulas. It measures formula fit
          quality and is <strong>not</strong> the CCER Table 35 ground-validation evidence above.
        </p>
        {data && (
          <div className="mt-3 overflow-x-auto rounded-md border border-stone-300 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-left text-stone-600">
                <tr>
                  <th className="p-3">Model</th>
                  <th className="p-3">R²</th>
                  <th className="p-3">RMSE (cm)</th>
                  <th className="p-3">Relative RMSE (%)</th>
                  <th className="p-3">MAE (cm)</th>
                </tr>
              </thead>
              <tbody>
                {data.cv_model_results.map((r) => (
                  <tr key={r.Model} className="border-t border-stone-200">
                    <td className="p-3 font-medium">{r.Model}</td>
                    <td className="p-3">{r.R2.toFixed(3)}</td>
                    <td className="p-3">{r.RMSE_cm.toFixed(2)}</td>
                    <td className="p-3">{r.rRMSE_percent.toFixed(2)}%</td>
                    <td className="p-3">{r.MAE_cm.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <figure>
          <Image
            src="/images/dbh_observed_vs_predicted.png"
            alt="Observed vs predicted DBH scatter plot"
            width={600}
            height={450}
            className="rounded-md border border-stone-300"
          />
          <p className="figure-caption">Figure 8 · DBH conversion: observed vs predicted (cross-validation)</p>
        </figure>
        <figure>
          <Image
            src="/images/dbh_residual_diagnostics.png"
            alt="Residual diagnostics plot"
            width={600}
            height={450}
            className="rounded-md border border-stone-300"
          />
          <p className="figure-caption">Figure 9 · DBH conversion: residual diagnostics</p>
        </figure>
      </div>
    </section>
  );
}
