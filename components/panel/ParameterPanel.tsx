"use client";

import { findNearestKOnGrid } from "@/lib/hooks/useScenarioLibrary";

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
      </div>
    </div>
  );
}
