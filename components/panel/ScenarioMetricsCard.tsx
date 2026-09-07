import type { KCalSizeScenario } from "@/lib/types/scenario";

interface ScenarioMetricsCardProps {
  scenario: KCalSizeScenario | undefined;
}

export function ScenarioMetricsCard({ scenario }: ScenarioMetricsCardProps) {
  if (!scenario) {
    return (
      <div className="rounded-md border border-stone-300 bg-white p-6 text-sm text-stone-500">
        暂无该参数组合的预计算结果，请调整滑块到已计算的网格点。
      </div>
    );
  }

  return (
    <div className="rounded-md border border-stone-300 bg-white p-6">
      <div className="grid grid-cols-2 gap-4 font-serif text-stone-800">
        <div>
          <div className="text-xs uppercase text-stone-500">相对基线改善</div>
          <div className="text-2xl font-semibold text-emerald-800">
            {scenario.improvement_pct.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-stone-500">两阶段 RMSE</div>
          <div className="text-2xl font-semibold">{scenario.rmse_m4.toFixed(2)} t C/ha</div>
        </div>
        <div>
          <div className="text-xs uppercase text-stone-500">简单随机基线 RMSE</div>
          <div className="text-lg text-stone-600">{scenario.rmse_m1.toFixed(2)} t C/ha</div>
        </div>
        <div>
          <div className="text-xs uppercase text-stone-500">相关长度 ℓ</div>
          <div className="text-lg text-stone-600">{scenario.ell_m.toFixed(1)} m</div>
        </div>
      </div>
    </div>
  );
}
