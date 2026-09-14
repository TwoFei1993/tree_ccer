"use client";

import { useEffect, useState } from "react";
import type {
  CcerCriterionRow,
  FactorialRow,
  SampleLayouts,
  SupplementaryData,
  SweepCurves,
  ZoneRmseRow,
} from "@/lib/types/stock";

interface StockData {
  factorial: FactorialRow[];
  sweeps: SweepCurves | null;
  zones: ZoneRmseRow[];
  supplementary: SupplementaryData | null;
  layouts: SampleLayouts | null;
  ccer: CcerCriterionRow[];
  loading: boolean;
}

/** 一次性加载2024碳储量论文的全部实验数据(stock_*.json)。
 * 各文件彼此独立,用Promise.allSettled聚合,单个失败不拖垮整页。 */
export function useStockData(): StockData {
  const [state, setState] = useState<StockData>({
    factorial: [],
    sweeps: null,
    zones: [],
    supplementary: null,
    layouts: null,
    ccer: [],
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    const fetchJson = async (url: string) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.json();
    };
    Promise.allSettled([
      fetchJson("/data/stock_full_factorial.json"),
      fetchJson("/data/stock_sweep_curves.json"),
      fetchJson("/data/stock_zone_rmse.json"),
      fetchJson("/data/stock_supplementary.json"),
      fetchJson("/data/stock_sample_layouts.json"),
      fetchJson("/data/stock_ccer_criterion.json"),
    ]).then(([factorial, sweeps, zones, supplementary, layouts, ccer]) => {
      if (cancelled) return;
      setState({
        factorial: factorial.status === "fulfilled" ? factorial.value : [],
        sweeps: sweeps.status === "fulfilled" ? sweeps.value : null,
        zones: zones.status === "fulfilled" ? zones.value : [],
        supplementary: supplementary.status === "fulfilled" ? supplementary.value : null,
        layouts: layouts.status === "fulfilled" ? layouts.value : null,
        ccer: ccer.status === "fulfilled" ? ccer.value : [],
        loading: false,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
