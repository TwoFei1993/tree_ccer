"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStockData } from "@/lib/hooks/useStockData";
import { Surface3DPanelGrid } from "./Surface3DSection";

const LINE_COLORS = ["#4d7c0f", "#b45309", "#1d4ed8", "#b91c1c", "#6b7280", "#0f766e", "#7c3aed"];

/** 结果章节:样本量扫描曲线(论文Figure 17)、E4三维曲面(图13交互版)、CCER均值口径对比(Table 5/图18)、分区精度(Table 6)。 */
export function ResultsSection() {
  const { sweeps, ccer, zones, loading } = useStockData();
  const [sweepView, setSweepView] = useState<"byEstimator" | "byDesign">("byEstimator");

  const sweepData = useMemo(() => {
    if (!sweeps) return [];
    const view = sweeps[sweepView];
    const names = Object.keys(view);
    const ns = view[names[0]].ns;
    return ns.map((n, i) => {
      const row: Record<string, string | number | undefined> = { n: String(n) };
      for (const name of names) {
        row[name] = view[name].rmseMean[i];
      }
      return row;
    });
  }, [sweeps, sweepView]);

  const sweepNames = useMemo(() => (sweeps ? Object.keys(sweeps[sweepView]) : []), [sweeps, sweepView]);

  const zoneData = useMemo(() => {
    // 每个分区一组柱:对比SMP与Zone random在E4下的分区RMSE(n=27)
    const zonesList = Array.from(new Set(zones.map((z) => z.zone))).sort();
    return zonesList.map((zone) => {
      const row: Record<string, string | number> = { zone };
      for (const [design, key] of [
        ["SMP-cLHS", "SMP-cLHS (E4)"],
        ["Zone random", "Zone random (E4)"],
      ] as const) {
        const hit = zones.find((z) => z.zone === zone && z.design === design && z.method === "E4 Reg + Kriging");
        if (hit) row[key] = hit.rmse;
      }
      return row;
    });
  }, [zones]);

  if (loading) {
    return <div className="p-8 text-center text-stone-500">Loading results…</div>;
  }

  return (
    <section className="space-y-6">
      <h2 className="font-serif text-2xl font-bold text-stone-900">Results</h2>

      <div className="rounded-md border border-stone-300 bg-white p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-lg font-semibold text-stone-900">
            Mapping error versus sample size
          </h3>
          <div className="flex gap-1">
            {(["byEstimator", "byDesign"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setSweepView(v)}
                className={`rounded-md border px-3 py-1 text-xs ${
                  sweepView === v
                    ? "border-emerald-700 bg-emerald-800 font-semibold text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                }`}
              >
                {v === "byEstimator" ? "By estimator" : "By design"}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={sweepData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="n" stroke="#78716c" fontSize={12} />
            <YAxis stroke="#78716c" fontSize={12} />
            <Tooltip formatter={(value) => `${Number(value).toFixed(2)} t C/ha`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {sweepNames.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <p className="figure-caption">
          Figure 5 · Mapping RMSE versus sample size ({sweeps?.nSeeds} replicates per level;
          estimator view: all under SMP; design view: all with E4)
        </p>
      </div>

      <div className="rounded-md border border-stone-300 bg-white p-6">
        <h3 className="font-serif text-lg font-semibold text-stone-900">
          Truth, E4 estimate, and error as interactive 3D surfaces
        </h3>
        <p className="mt-1 text-sm text-stone-600">
          The E4 fused estimator (regression + kriged residuals, n = 54 SMP plots) keeps the main
          terrain of the truth surface; the error concentrates in the low-NDVI sparse patches that
          small random samples under-cover. Drag on a panel to rotate.
        </p>
        <div className="mt-3">
          <Surface3DPanelGrid />
        </div>
        <p className="figure-caption">
          Figure 6 · Carbon-stock 3D surfaces: truth vs E4 estimate vs |error| (n = 54, SMP, seed
          0) — interactive version
        </p>
      </div>

      {ccer.length > 0 && (
        <div className="rounded-md border border-stone-300 bg-white p-6">
          <h3 className="font-serif text-lg font-semibold text-stone-900">
            Relative error of the mean estimate under the CCER criterion
          </h3>
          <p className="mt-1 text-sm text-stone-600">
            The official CCER criterion scores only the regional mean. Optimized sampling with a
            fused estimator stays well below the CCER theoretical uncertainty at every budget.
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={ccer} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="n" stroke="#78716c" fontSize={12} />
              <YAxis stroke="#78716c" fontSize={12} unit="%" />
              <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {/* 理论u虚线(附录F公式)与10%表35免扣减线,复刻论文图18的参考元素 */}
              <Line
                type="monotone"
                dataKey="theoreticalU"
                name="CCER theoretical u (Appendix F)"
                stroke="#374151"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="ccerCurrent"
                name="CCER current: random + sample mean"
                stroke="#111827"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="e4Smp"
                name="E4 + SMP"
                stroke="#dc2626"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="e7Smp"
                name="E7 + SMP"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="e4ZoneRandom"
                name="E4 + zone random"
                stroke="#9ca3af"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <ReferenceLine
                y={10}
                stroke="#dc2626"
                strokeDasharray="2 4"
                label={{
                  value: "u = 10% (Table 35 no-deduction line)",
                  position: "insideTopRight",
                  fontSize: 11,
                  fill: "#dc2626",
                }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="figure-caption">
            Figure 7 · Relative error of the mean estimate versus sample size (100 replicates);
            dashed black: CCER Appendix F theoretical u; red dotted: the u = 10% no-deduction
            threshold of Table 35
          </p>
        </div>
      )}

      {zoneData.length > 0 && (
        <div className="rounded-md border border-stone-300 bg-white p-6">
          <h3 className="font-serif text-lg font-semibold text-stone-900">
            Zone-level accuracy at n = 27
          </h3>
          <p className="mt-1 text-sm text-stone-600">
            Global RMSE hides local differences: random sampling lets the error explode in the most
            heterogeneous zones, while SMP keeps every zone usable.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={zoneData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="zone" stroke="#78716c" fontSize={12} />
              <YAxis stroke="#78716c" fontSize={12} />
              <Tooltip formatter={(value) => `${Number(value).toFixed(1)} t C/ha`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="SMP-cLHS (E4)" stroke="#4d7c0f" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Zone random (E4)" stroke="#ca8a04" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="figure-caption">
            Figure 8 · Per-zone mapping RMSE (n = 27, mean of 20 seeds, t C/ha)
          </p>
        </div>
      )}
    </section>
  );
}
