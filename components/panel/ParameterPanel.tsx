"use client";

import { findNearestKOnGrid } from "@/lib/hooks/useScenarioLibrary";

interface PriorModelComparisonItem {
  name: string;
  improvementMeanPct: number;
}

interface ParameterPanelProps {
  kGrid: number[];
  calSizeGrid: number[];
  priorModelNames: string[];
  selectedK: number;
  selectedCalSize: number;
  selectedPriorModel: string;
  onKChange: (k: number) => void;
  onCalSizeChange: (calSize: number) => void;
  onPriorModelChange: (name: string) => void;
  /** 固定k/校准集规模下四种先验模型配置的改善幅度均值对比,用于在选择器旁给出可见反馈——
   * 否则切换选项只更新一个从未渲染到任何地方的状态,专家看不出选它做了什么(见评审反馈)。
   * 数据来自scenarios_prior_models.json,与地图/网格图层无关,不需要重建Deck实例。 */
  priorModelComparison: PriorModelComparisonItem[];
  /** priorModelComparison对应的固定k值(scenarios_prior_models.json里离散的k∈{30,50,80,120,200}),
   * 用于向专家说明这组对比数字是在哪个k下算出来的 */
  priorModelK: number;
}

export function ParameterPanel({
  kGrid,
  calSizeGrid,
  priorModelNames,
  selectedK,
  selectedCalSize,
  selectedPriorModel,
  onKChange,
  onCalSizeChange,
  onPriorModelChange,
  priorModelComparison,
  priorModelK,
}: ParameterPanelProps) {
  const minK = Math.min(...kGrid);
  const maxK = Math.max(...kGrid);
  const minCalSize = Math.min(...calSizeGrid);
  const maxCalSize = Math.max(...calSizeGrid);

  return (
    <div className="space-y-6 rounded-md border border-stone-300 bg-stone-50 p-6">
      <div>
        <label htmlFor="k-slider" className="block font-serif text-sm text-stone-700">
          监测样本量 k = <span className="font-semibold">{selectedK}</span>
        </label>
        <input
          id="k-slider"
          aria-label="监测样本量 k"
          type="range"
          min={minK}
          max={maxK}
          value={selectedK}
          onChange={(e) => onKChange(findNearestKOnGrid(kGrid, Number(e.target.value)))}
          className="mt-2 w-full accent-emerald-800"
        />
      </div>

      <div>
        <label htmlFor="cal-size-slider" className="block font-serif text-sm text-stone-700">
          校准集规模 = <span className="font-semibold">{selectedCalSize}</span>
        </label>
        <p className="mt-1 text-xs text-stone-500">
          一次性用于训练遥感先验模型与空间协方差参数（σ²、ℓ）的样点数量，与上方&ldquo;监测样本量
          k&rdquo;是两个互不重叠的独立样点集合——校准只做一次，之后每次监测复用同一批已校准好的参数。
        </p>
        <input
          id="cal-size-slider"
          aria-label="校准集规模"
          type="range"
          min={minCalSize}
          max={maxCalSize}
          value={selectedCalSize}
          onChange={(e) => onCalSizeChange(findNearestKOnGrid(calSizeGrid, Number(e.target.value)))}
          className="mt-2 w-full accent-emerald-800"
        />
      </div>

      <div>
        <label htmlFor="prior-model-select" className="block font-serif text-sm text-stone-700">
          先验模型
        </label>
        <select
          id="prior-model-select"
          aria-label="先验模型"
          value={selectedPriorModel}
          onChange={(e) => onPriorModelChange(e.target.value)}
          className="mt-2 w-full rounded border border-stone-300 bg-white p-2 text-sm"
        >
          {priorModelNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {priorModelComparison.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-stone-500">
              固定校准集规模 n=200、监测样本量 k={priorModelK} 下四种配置的改善幅度均值对比
              （跨5个独立校准种子）：
            </p>
            {priorModelComparison.map((item) => {
              const isSelected = item.name === selectedPriorModel;
              const widthPct = Math.max(2, Math.min(100, item.improvementMeanPct));
              return (
                <div key={item.name} className="text-xs">
                  <div
                    className={`mb-0.5 flex items-center justify-between ${
                      isSelected ? "font-semibold text-emerald-900" : "text-stone-600"
                    }`}
                  >
                    <span className="truncate pr-2">{item.name}</span>
                    <span className="shrink-0 tabular-nums">{item.improvementMeanPct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isSelected ? "bg-emerald-700" : "bg-stone-400"
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
