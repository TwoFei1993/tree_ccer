"use client";

import { useEffect, useMemo, useRef } from "react";
import { Deck } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import type { Feature, FeatureCollection, Geometry, Polygon } from "geojson";
import type { GridCarbonProperties } from "@/lib/types/geo";
import { gridIdsToPoints, buildSamplePointsLayer } from "@/lib/map/samplePointsLayer";

const GRID_VIEW_STATE = {
  longitude: 117.31,
  latitude: 42.408,
  zoom: 15,
  pitch: 0, // 网格分辨率图层用纯俯视,与首屏单木倾斜视角区分,避免混淆两种不同精度的可视化
  bearing: 0,
};

interface GridSampleMapProps {
  gridData: FeatureCollection<Polygon, GridCarbonProperties>;
  sampleGridIds: number[];
  /** Grid_ID -> Kriging修正后碳汇增量估计值,来自当前选中场景的corrected_surface/corrected_surface_grid_ids
   * (设计文档§2/§4要求的"Kriging修正曲面"图层数据,不是占位的静态底色) */
  correctedSurfaceByGridId: Map<number, number>;
  /** 用于生成图层id后缀,不同k/校准集规模组合复用同一个Deck实例,不需要以此重建实例 */
  layerIdSuffix: string;
}

/** 修正曲面色阶:低估计值浅黄,高估计值深绿,与carbonToColor(单木图层用)区分开,
 * 避免专家把两个不同分辨率的图层色阶混为一谈 */
function surfaceValueToColor(value: number, minVal: number, maxVal: number): [number, number, number] {
  const range = maxVal - minVal || 1;
  const t = Math.min(1, Math.max(0, (value - minVal) / range));
  const low: [number, number, number] = [245, 236, 180];
  const high: [number, number, number] = [30, 90, 60];
  return [
    Math.round(low[0] + (high[0] - low[0]) * t),
    Math.round(low[1] + (high[1] - low[1]) * t),
    Math.round(low[2] + (high[2] - low[2]) * t),
  ];
}

export function GridSampleMap({
  gridData,
  sampleGridIds,
  correctedSurfaceByGridId,
  layerIdSuffix,
}: GridSampleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<Deck | null>(null);

  const [minVal, maxVal] = useMemo(() => {
    const values = Array.from(correctedSurfaceByGridId.values());
    if (values.length === 0) return [0, 1];
    return [Math.min(...values), Math.max(...values)];
  }, [correctedSurfaceByGridId]);

  // 挂载时创建一次Deck实例,依赖数组为[],之后永远复用同一个实例(修复问题2)
  useEffect(() => {
    if (!containerRef.current) return;
    const canvasEl = document.createElement("canvas");
    const deck = new Deck({
      canvas: canvasEl, // 直接把自己创建的canvas传给构造函数,之后用局部引用appendChild,不读deck.canvas(修复问题1)
      initialViewState: GRID_VIEW_STATE,
      controller: true,
      layers: [],
    });
    containerRef.current.appendChild(canvasEl);
    deckRef.current = deck;

    return () => {
      deck.finalize();
      deckRef.current = null;
    };
  }, []);

  // 数据/抽样点变化时,对同一个Deck实例调用setProps更新图层,触发transitions配置的平滑过渡
  useEffect(() => {
    if (!deckRef.current) return;

    const gridLayer = new GeoJsonLayer({
      id: "grid-carbon-base",
      data: gridData,
      filled: true,
      getFillColor: (f: Feature<Geometry, GridCarbonProperties>): [number, number, number, number] => {
        const val = correctedSurfaceByGridId.get(f.properties.Grid_ID);
        if (val === undefined) return [230, 230, 220, 160];
        const [r, g, b] = surfaceValueToColor(val, minVal, maxVal);
        return [r, g, b, 200];
      },
      getLineColor: [140, 140, 120, 200],
      lineWidthMinPixels: 0.5,
      transitions: { getFillColor: 400 }, // 参数切换时修正曲面颜色也平滑过渡,不是硬跳变
    });
    const samplePoints = gridIdsToPoints(gridData, sampleGridIds);
    const pointsLayer = buildSamplePointsLayer(samplePoints, layerIdSuffix);

    deckRef.current.setProps({ layers: [gridLayer, pointsLayer] });
  }, [gridData, sampleGridIds, correctedSurfaceByGridId, minVal, maxVal, layerIdSuffix]);

  return (
    <div
      ref={containerRef}
      className="h-[50vh] w-full rounded-md border border-stone-300 bg-stone-50"
      data-testid="grid-sample-map"
    />
  );
}
