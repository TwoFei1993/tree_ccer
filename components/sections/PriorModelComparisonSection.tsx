"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PriorModelScenario } from "@/lib/types/scenario";

function toChartData(scenarios: PriorModelScenario[]) {
  const kValues = scenarios.length > 0 ? Object.keys(scenarios[0].per_k) : [];
  return kValues.map((k) => {
    const row: Record<string, string | number> = { k: `k=${k}` };
    for (const sc of scenarios) {
      row[sc.config_name] = sc.per_k[k]?.improvement_mean_pct ?? 0;
    }
    return row;
  });
}

const COLORS = ["#94a3b8", "#38bdf8", "#22c55e", "#f59e0b"];

export function PriorModelComparisonSection() {
  const [scenarios, setScenarios] = useState<PriorModelScenario[]>([]);

  useEffect(() => {
    fetch("/data/scenarios_prior_models.json")
      .then((r) => r.json())
      .then(setScenarios)
      .catch((err) => console.error("[PriorModelComparisonSection] 数据加载失败", err));
  }, []);

  const chartData = toChartData(scenarios);

  return (
    <section className="space-y-4">
      <h2 className="font-serif text-2xl font-bold text-stone-900">先验模型选择的影响</h2>
      <p className="text-sm text-stone-600">
        在固定校准集规模（n=200，跨5个独立校准种子）下，比较四种遥感先验模型配置在不同监测样本量下的改善幅度。
      </p>
      <div className="rounded-md border border-stone-300 bg-white p-6">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="k" stroke="#78716c" fontSize={12} />
            <YAxis stroke="#78716c" fontSize={12} unit="%" />
            <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {scenarios.map((sc, i) => (
              <Bar key={sc.config_name} dataKey={sc.config_name} fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <p className="figure-caption">图 4 · 四种先验模型配置的改善幅度均值对比（跨5个独立校准种子）</p>
      </div>
    </section>
  );
}
