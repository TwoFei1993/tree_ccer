"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// 数字来源:碳汇增量空间误差抽样_完整版.ipynb cell 12(变异系数)与cell 19-20(LOO R2)
const CV_DATA = [
  { metric: "碳储量", value: 30 },
  { metric: "碳汇增量", value: 360 },
];
const R2_DATA = [
  { metric: "碳储量", value: 63 },
  { metric: "碳汇增量", value: 3 },
];

const BAR_COLORS: Record<string, string> = {
  碳储量: "#a8c498",
  碳汇增量: "#2d5a2d",
};

/** 变异系数(%)与遥感解释力R²(×100)是两个不同量级/单位的指标,分开成两张独立坐标轴的
 * 小图表而不是共用一条数值轴的横向条形图——避免专家把两组条形的绝对长度直接比较,
 * 误读成"两个指标同一量级",这在共轴呈现时容易产生误导。 */
export function DifficultyComparisonChart() {
  return (
    <div className="rounded-md border border-stone-300 bg-white p-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-stone-500">
            变异系数 CV (%)
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={CV_DATA} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis type="number" stroke="#78716c" fontSize={12} />
              <YAxis type="category" dataKey="metric" width={70} stroke="#78716c" fontSize={12} />
              <Tooltip />
              <Bar dataKey="value">
                {CV_DATA.map((d) => (
                  <Cell key={d.metric} fill={BAR_COLORS[d.metric]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-stone-500">
            遥感先验解释力 R² (×100)
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={R2_DATA} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis type="number" stroke="#78716c" fontSize={12} />
              <YAxis type="category" dataKey="metric" width={70} stroke="#78716c" fontSize={12} />
              <Tooltip />
              <Bar dataKey="value">
                {R2_DATA.map((d) => (
                  <Cell key={d.metric} fill={BAR_COLORS[d.metric]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p className="figure-caption">
        图 2 · 碳储量（存量）与碳汇增量（ΔC）的估计难度对比：变异系数相差12倍，遥感解释力相差21倍
      </p>
    </div>
  );
}
