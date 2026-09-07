"use client";

import { useEffect, useMemo, useRef } from "react";
import { Deck } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import type { Feature, FeatureCollection, Geometry, Polygon } from "geojson";
import type { GridCarbonProperties } from "@/lib/types/geo";
import { gridIdsToPoints, buildSamplePointsLayer } from "@/lib/map/samplePointsLayer";
import { WebGLGuard } from "@/components/map/WebGLGuard";

// zoom=17:研究区实际约500m x 500m,zoom=15(城市街区级)会让网格/采样点在视觉上过小,
// 与TreeCrownMap.tsx/DualPeriodCompare.tsx使用同样修正后的zoom值,保持三处地图视角一致
const GRID_VIEW_STATE = {
  longitude: 117.313,
  latitude: 42.409,
  zoom: 17,
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
    const container = containerRef.current;
    const canvasEl = document.createElement("canvas");
    // 显式撑满父容器:canvas元素若不设CSS尺寸,其box就是浏览器默认的300x150物理属性值,
    // 不会随父容器resize(luma.gl的ResizeObserver监听的是canvas自身的box,而非父容器),
    // 导致WebGL视口和拾取坐标系永远停留在300x150,与实际显示区域完全错位。
    canvasEl.style.width = "100%";
    canvasEl.style.height = "100%";
    canvasEl.style.display = "block";
    const deck = new Deck({
      canvas: canvasEl, // 直接把自己创建的canvas传给构造函数,之后用局部引用appendChild,不读deck.canvas(修复问题1)
      initialViewState: GRID_VIEW_STATE,
      controller: true,
      layers: [],
    });
    container.appendChild(canvasEl);
    deckRef.current = deck;

    // canvas的CSS box(canvas.style.width/height)确实随容器撑满了,但luma.gl内部靠自身
    // ResizeObserver同步canvas.width/height这两个物理像素分辨率属性的机制在实测中并未
    // 按预期触发(尤其是容器父级是CSS Grid布局时),导致WebGL drawing buffer停留在浏览器
    // 默认的300x150不变,而deck.setProps({width,height})只会覆盖canvas.style.width/height
    // (CSS渲染尺寸),同样不触碰物理分辨率。直接手动设置canvas.width/height物理属性(按
    // devicePixelRatio换算保证清晰度)并调用deck.redraw(),完全绕开不可靠的内部机制。
    const syncCanvasResolution = (width: number, height: number) => {
      const dpr = window.devicePixelRatio || 1;
      canvasEl.width = Math.round(width * dpr);
      canvasEl.height = Math.round(height * dpr);
      deck.setProps({ width, height });
      deck.redraw();
    };
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      syncCanvasResolution(width, height);
    });
    resizeObserver.observe(container);
    // ResizeObserver的第一次callback是异步的(下一帧才触发),初始挂载时先用当前的
    // getBoundingClientRect同步设置一次,避免第一帧渲染仍停留在默认300x150。
    const initialRect = container.getBoundingClientRect();
    if (initialRect.width > 0 && initialRect.height > 0) {
      syncCanvasResolution(initialRect.width, initialRect.height);
    }

    return () => {
      resizeObserver.disconnect();
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
    <WebGLGuard heightClassName="h-[50vh]">
      <div
        ref={containerRef}
        className="h-[50vh] w-full rounded-md border border-stone-300 bg-stone-50"
        data-testid="grid-sample-map"
      />
    </WebGLGuard>
  );
}
