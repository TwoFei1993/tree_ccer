"use client";

import { useEffect, useState } from "react";
import type { KCalSizeScenario, PriorModelScenario } from "@/lib/types/scenario";

/** 在预计算网格中精确查找(k, cal_size)对应的场景,找不到返回undefined(网格是离散的,不做插值) */
export function findScenario(
  scenarios: KCalSizeScenario[],
  k: number,
  calSize: number
): KCalSizeScenario | undefined {
  return scenarios.find((s) => s.k === k && s.cal_size === calSize);
}

/** 把用户拖动滑块得到的任意k值,吸附到预计算网格中最近的可用k值 */
export function findNearestKOnGrid(availableKs: number[], targetK: number): number {
  return availableKs.reduce((closest, k) =>
    Math.abs(k - targetK) < Math.abs(closest - targetK) ? k : closest
  );
}

interface ScenarioLibraryState {
  kCalSizeScenarios: KCalSizeScenario[];
  priorModelScenarios: PriorModelScenario[];
  loading: boolean;
  error: string | null;
}

export function useScenarioLibrary(): ScenarioLibraryState {
  const [state, setState] = useState<ScenarioLibraryState>({
    kCalSizeScenarios: [],
    priorModelScenarios: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/data/scenarios_k_calsize.json").then((r) => r.json()),
      fetch("/data/scenarios_prior_models.json").then((r) => r.json()),
    ])
      .then(([kCalSizeScenarios, priorModelScenarios]) => {
        if (!cancelled) {
          setState({ kCalSizeScenarios, priorModelScenarios, loading: false, error: null });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false, error: String(err) }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
