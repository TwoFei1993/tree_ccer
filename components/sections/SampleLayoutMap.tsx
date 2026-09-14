"use client";

import { useEffect, useMemo, useRef } from "react";
import { Deck } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import { ZoomWidget } from "@deck.gl/widgets";
import "@deck.gl/widgets/stylesheet.css";
import type { Feature, FeatureCollection, Geometry, Polygon } from "geojson";
import { WebGLGuard } from "@/components/map/WebGLGuard";
import { fitBoundsViewState } from "@/lib/map/geoUtils";

interface SampleLayoutMapProps {
  gridData: FeatureCollection<Polygon, { Grid_ID: number; Carbon_tha_24: number }>;
  /** 当前选中样地的Grid_ID集合(1-based),未命中的网格淡显 */
  selectedGridIds: Set<number>;
  /** 图层id后缀:设计×样本量变化时复用同一个Deck实例,只更新图层 */
  layerIdSuffix: string;
}

/** 选中样地按2024碳密度着色:低值浅黄绿,高值深绿,与论文图10的Voronoi着色逻辑同源 */
function carbonToColor(carbon: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, carbon / 120));
  const low: [number, number, number] = [219, 232, 202];
  const high: [number, number, number] = [35, 84, 55];
  return [
    Math.round(low[0] + (high[0] - low[0]) * t),
    Math.round(low[1] + (high[1] - low[1]) * t),
    Math.round(low[2] + (high[2] - low[2]) * t),
  ];
}

export function SampleLayoutMap({ gridData, selectedGridIds, layerIdSuffix }: SampleLayoutMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<Deck | null>(null);
  const resetViewRef = useRef<(() => void) | null>(null);
  // selectedGridIds用Set,但要拿到"当前"集合而不是effect闭包里的旧引用——经ref中转
  const selectedRef = useRef(selectedGridIds);
  selectedRef.current = selectedGridIds;

  // Deck实例只在挂载时创建一次;canvas生命周期细节(syncCanvasResolution/复位视角/
  // onLoad与fonts.ready自动校正)与原交互面板地图同一套已验证的模式
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const initialViewState = fitBoundsViewState(rect.width || 580, rect.height || 453);
    const deck = new Deck({
      parent: container,
      initialViewState,
      controller: { scrollZoom: false },
      layers: [],
      widgets: [new ZoomWidget({ placement: "top-right" })],
      onLoad: () => {
        requestAnimationFrame(() => requestAnimationFrame(() => resetViewRef.current?.()));
      },
    });
    deckRef.current = deck;

    const syncCanvas = (width: number, height: number) => {
      const canvasEl = deck.getCanvas();
      if (!canvasEl) return;
      const dpr = window.devicePixelRatio || 1;
      canvasEl.width = Math.round(width * dpr);
      canvasEl.height = Math.round(height * dpr);
      deck.setProps({ width, height, initialViewState: fitBoundsViewState(width, height) });
      deck.redraw();
    };
    resetViewRef.current = () => {
      const r = container.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) syncCanvas(r.width, r.height);
    };
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      syncCanvas(entry.contentRect.width, entry.contentRect.height);
    });
    resizeObserver.observe(container);
    const initialRect = container.getBoundingClientRect();
    if (initialRect.width > 0 && initialRect.height > 0) {
      syncCanvas(initialRect.width, initialRect.height);
    }
    document.fonts?.ready?.then(() => resetViewRef.current?.());

    return () => {
      resizeObserver.disconnect();
      deck.finalize();
      deckRef.current = null;
      resetViewRef.current = null;
      container.innerHTML = "";
    };
  }, []);

  // 数据/选点变化时对同一Deck实例setProps更新图层
  useEffect(() => {
    if (!deckRef.current) return;
    const layer = new GeoJsonLayer({
      id: `sample-layout-${layerIdSuffix}`,
      data: gridData,
      filled: true,
      getFillColor: (f: Feature<Geometry, { Grid_ID: number; Carbon_tha_24: number }>) => {
        if (!selectedRef.current.has(f.properties.Grid_ID)) return [235, 233, 228, 60];
        const [r, g, b] = carbonToColor(f.properties.Carbon_tha_24 ?? 0);
        return [r, g, b, 220];
      },
      getLineColor: (f: Feature<Geometry, { Grid_ID: number }>) =>
        selectedRef.current.has(f.properties.Grid_ID) ? [30, 70, 40, 230] : [200, 198, 192, 60],
      lineWidthMinPixels: 1,
      transitions: { getFillColor: 300 },
    });
    deckRef.current.setProps({ layers: [layer] });
  }, [gridData, layerIdSuffix]);

  const legendGradient = useMemo(() => {
    const stops = Array.from({ length: 6 }, (_, i) => {
      const [r, g, b] = carbonToColor((120 * i) / 5);
      return `rgb(${r},${g},${b})`;
    });
    return `linear-gradient(to right, ${stops.join(", ")})`;
  }, []);

  return (
    <div>
      <WebGLGuard heightClassName="h-[50vh]">
        <div className="relative">
          <div
            ref={containerRef}
            className="relative h-[50vh] w-full overflow-hidden rounded-md border border-stone-300 bg-stone-50"
            data-testid="sample-layout-map"
          />
          <button
            type="button"
            onClick={() => resetViewRef.current?.()}
            className="absolute left-2 top-2 z-10 rounded-md border border-stone-300 bg-white/90 px-2 py-1 text-xs text-stone-700 shadow-sm hover:bg-white"
          >
            Reset view
          </button>
        </div>
      </WebGLGuard>
      <div className="mt-2 flex items-center gap-2 text-xs text-stone-600">
        <span>2024 carbon density of selected plots (t C/ha):</span>
        <div className="h-3 w-32 rounded-sm border border-stone-300" style={{ background: legendGradient }} />
        <span>0 – 120</span>
      </div>
    </div>
  );
}
