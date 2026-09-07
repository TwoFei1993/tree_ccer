import { DifficultyComparisonChart } from "./DifficultyComparisonChart";

const STAGES = [
  {
    title: "第一阶段：校准（一次性，n = 150–300）",
    body: "用一批较大规模的样点，一次性训练遥感先验模型（NDVI/NIRv → 碳汇增量），并拟合空间协方差参数 σ²、ℓ。这一步类似仪器标定：标定好之后可重复用于多次监测。",
  },
  {
    title: "第二阶段：监测（重复进行，k 可小至 30）",
    body: "每次监测只需抽取 k 个全新样点（不与校准集重叠），用已校准好的先验和协方差参数做 Kriging 修正。最终估计只对监测池取平均，不夹带校准集的精确真值。",
  },
];

export function MethodologySection() {
  return (
    <section className="space-y-8">
      <h2 className="font-serif text-2xl font-bold text-stone-900">方法论：两阶段空间误差抽样协议</h2>

      <div className="grid gap-4 md:grid-cols-2">
        {STAGES.map((s, i) => (
          <div key={s.title} className="rounded-md border border-stone-300 bg-white p-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">
              步骤 {i + 1}
            </div>
            <h3 className="font-serif text-lg font-semibold text-stone-900">{s.title}</h3>
            <p className="mt-2 text-sm text-stone-600">{s.body}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-serif text-lg font-semibold text-stone-900">
          为什么碳汇增量比碳储量存量更难估计
        </h3>
        <p className="mt-2 text-sm text-stone-600">
          将ΔC（碳汇增量）与碳储量存量对比：相减运算抵消了两期共有的空间格局，但两期各自的独立波动反而叠加，
          导致信噪比急剧恶化——变异系数从30%升至360%，遥感光谱对增量的解释力从63%骤降至3%。
        </p>
        <div className="mt-4">
          <DifficultyComparisonChart />
        </div>
      </div>
    </section>
  );
}
