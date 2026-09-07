"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection, Polygon } from "geojson";
import { useScenarioLibrary, findScenario, findNearestKOnGrid } from "@/lib/hooks/useScenarioLibrary";
import { ParameterPanel } from "./ParameterPanel";
import { ScenarioMetricsCard } from "./ScenarioMetricsCard";
import { GridSampleMap } from "./GridSampleMap";
import type { GridCarbonProperties } from "@/lib/types/geo";

const DEFAULT_K = 120;
const DEFAULT_CAL_SIZE = 200;

export function InteractiveModelSection() {
  const { kCalSizeScenarios, priorModelScenarios, loading } = useScenarioLibrary();
  const [selectedK, setSelectedK] = useState(DEFAULT_K);
  const [selectedCalSize, setSelectedCalSize] = useState(DEFAULT_CAL_SIZE);
  const [selectedPriorModel, setSelectedPriorModel] = useState("");
  const [gridData, setGridData] = useState<FeatureCollection<Polygon, GridCarbonProperties> | null>(null);

  useEffect(() => {
    fetch("/data/grid-carbon.geojson")
      .then((r) => r.json())
      .then(setGridData)
      .catch((err) => console.error("[InteractiveModelSection] 网格数据加载失败", err));
  }, []);

  useEffect(() => {
    if (priorModelScenarios.length > 0 && !selectedPriorModel) {
      setSelectedPriorModel(priorModelScenarios[0].config_name);
    }
  }, [priorModelScenarios, selectedPriorModel]);

  const kGrid = useMemo(
    () => Array.from(new Set(kCalSizeScenarios.map((s) => s.k))).sort((a, b) => a - b),
    [kCalSizeScenarios]
  );
  const calSizeGrid = useMemo(
    () => Array.from(new Set(kCalSizeScenarios.map((s) => s.cal_size))).sort((a, b) => a - b),
    [kCalSizeScenarios]
  );
  const priorModelNames = useMemo(() => priorModelScenarios.map((s) => s.config_name), [priorModelScenarios]);

  // scenarios_prior_models.json的k是独立于k×校准集规模网格的离散集合(见build_scenario_prior_models.py
  // K_LIST_DEFAULT=[30,50,80,120,200]),不是k滑块此刻选中的任意值——把滑块的selectedK吸附到
  // 这组离散k上,让四模型对比数字始终对应一个真实预计算过的k,而不是猜一个不存在的组合。
  const priorModelKGrid = useMemo(
    () =>
      priorModelScenarios.length > 0
        ? Array.from(new Set(Object.keys(priorModelScenarios[0].per_k).map(Number))).sort((a, b) => a - b)
        : [],
    [priorModelScenarios]
  );
  const priorModelK =
    priorModelKGrid.length > 0 ? findNearestKOnGrid(priorModelKGrid, selectedK) : selectedK;
  const priorModelComparison = useMemo(
    () =>
      priorModelScenarios.map((s) => ({
        name: s.config_name,
        improvementMeanPct: s.per_k[String(priorModelK)]?.improvement_mean_pct ?? 0,
      })),
    [priorModelScenarios, priorModelK]
  );

  const activeScenario = useMemo(
    () => findScenario(kCalSizeScenarios, selectedK, selectedCalSize),
    [kCalSizeScenarios, selectedK, selectedCalSize]
  );

  const correctedSurfaceByGridId = useMemo(() => {
    if (!activeScenario) return new Map<number, number>();
    const map = new Map<number, number>();
    activeScenario.corrected_surface_grid_ids.forEach((gridId, i) => {
      map.set(gridId, activeScenario.corrected_surface[i]);
    });
    return map;
  }, [activeScenario]);

  if (loading) {
    return <div className="p-8 text-center text-stone-500">正在加载预计算场景库…</div>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      {gridData && activeScenario ? (
        <GridSampleMap
          gridData={gridData}
          sampleGridIds={activeScenario.sample_grid_ids}
          correctedSurfaceByGridId={correctedSurfaceByGridId}
          layerIdSuffix={`${selectedK}-${selectedCalSize}`}
        />
      ) : (
        <div className="flex h-[50vh] w-full items-center justify-center rounded-md border border-stone-300 bg-stone-50 text-sm text-stone-400">
          {gridData ? "该参数组合暂无预计算结果" : "加载网格数据中…"}
        </div>
      )}
      <div className="space-y-4">
        <ParameterPanel
          kGrid={kGrid}
          calSizeGrid={calSizeGrid}
          priorModelNames={priorModelNames}
          selectedK={selectedK}
          selectedCalSize={selectedCalSize}
          selectedPriorModel={selectedPriorModel}
          onKChange={setSelectedK}
          onCalSizeChange={setSelectedCalSize}
          onPriorModelChange={setSelectedPriorModel}
          priorModelComparison={priorModelComparison}
          priorModelK={priorModelK}
        />
        <ScenarioMetricsCard scenario={activeScenario} />
      </div>
    </div>
  );
}
