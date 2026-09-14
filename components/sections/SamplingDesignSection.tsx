"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FeatureCollection, Polygon } from "geojson";
import { useStockData } from "@/lib/hooks/useStockData";
import { SampleLayoutMap } from "./SampleLayoutMap";

const DESIGNS = ["SMP-cLHS", "Zone random", "Zone systematic"] as const;
const N_LEVELS = [27, 54, 90] as const;

/** 全因子交互面板:选设计×样本量,地图展示该组合的实际选点布局(seed 0),
 * 下方柱状图对比该组合下七个估算器的制图RMSE(20种子均值)。对应论文Table 2。 */
export function SamplingDesignSection() {
  const { factorial, layouts, loading } = useStockData();
  const [design, setDesign] = useState<(typeof DESIGNS)[number]>("SMP-cLHS");
  const [n, setN] = useState<(typeof N_LEVELS)[number]>(27);
  const [gridData, setGridData] = useState<FeatureCollection<
    Polygon,
    { Grid_ID: number; Carbon_tha_24: number }
  > | null>(null);

  useEffect(() => {
    fetch("/data/grid-carbon.geojson")
      .then((r) => r.json())
      .then(setGridData)
      .catch((err) => console.error("[SamplingDesignSection] grid data failed", err));
  }, []);

  const selectedIds = useMemo(() => {
    const ids = layouts?.[design]?.[String(n)];
    return new Set(ids ?? []);
  }, [layouts, design, n]);

  const chartData = useMemo(
    () =>
      factorial
        .filter((r) => r.design === design && r.n === n)
        .map((r) => ({
          method: r.method.replace(/^(E\d) .*/, "$1"),
          fullName: r.method,
          rmse: r.rmseMean,
          rmseSd: r.rmseSd,
        })),
    [factorial, design, n],
  );

  if (loading) {
    return <div className="p-8 text-center text-stone-500">Loading experiment data…</div>;
  }

  return (
    <section className="space-y-4">
      <h2 className="font-serif text-2xl font-bold text-stone-900">Explore the sampling designs</h2>
      <p className="text-sm text-stone-600">
        Pick a sampling design and verification budget n, then compare how the seven estimators
        perform for that combination. The map shows one actual layout (seed 0) of the 576-plot
        grid: highlighted cells are the selected plots, shaded by their 2024 carbon density.
      </p>

      <div className="flex flex-wrap items-center gap-4 rounded-md border border-stone-300 bg-stone-50 p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Design</span>
          {DESIGNS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDesign(d)}
              className={`rounded-md border px-3 py-1 text-xs ${
                design === d
                  ? "border-emerald-700 bg-emerald-800 font-semibold text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">n</span>
          {N_LEVELS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setN(v)}
              className={`rounded-md border px-3 py-1 text-xs ${
                n === v
                  ? "border-emerald-700 bg-emerald-800 font-semibold text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {gridData ? (
        <div>
          <SampleLayoutMap
            gridData={gridData}
            selectedGridIds={selectedIds}
            layerIdSuffix={`${design}-${n}`}
          />
          <p className="figure-caption">
            Figure 3 · Actual sample layout of {design} at n = {n} (seed 0), shaded by 2024 plot
            carbon density
          </p>
        </div>
      ) : (
        <div className="flex h-[50vh] w-full items-center justify-center rounded-md border border-stone-300 bg-stone-50 text-sm text-stone-400">
          Loading grid data…
        </div>
      )}

      <div className="rounded-md border border-stone-300 bg-white p-6">
        <p className="text-sm text-stone-600">
          Mapping RMSE by estimator — {design}, n = {n} (t C/ha, mean of 20 seeds; lower is better).
          Error bars show ±1 SD across seeds.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="method" stroke="#78716c" fontSize={12} />
            <YAxis stroke="#78716c" fontSize={12} />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(2)}`, "RMSE (t C/ha)"]}
              labelFormatter={(label, payload) => {
                const p = payload?.[0]?.payload as { fullName?: string } | undefined;
                return p?.fullName ?? String(label);
              }}
            />
            <Bar dataKey="rmse" fill="#4d7c0f" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="figure-caption">
          Figure 4 · Full-factorial slice: estimator RMSE under {design} sampling at n = {n}
        </p>
      </div>
    </section>
  );
}
