"use client";

import { useEffect, useRef, useState } from "react";
import { Deck } from "@deck.gl/core";
import type { FeatureCollection, Geometry } from "geojson";
import type { TreeCrownProperties } from "@/lib/types/geo";
import { buildTreeCrownExtrusionLayer } from "@/lib/map/deckLayers";
import { WebGLGuard } from "@/components/map/WebGLGuard";

// zoom=17:研究区实际约500m x 500m,zoom=15(城市街区级)会让树冠在视觉上缩成几个像素,
// 与TreeCrownMap.tsx使用同样修正后的zoom值,保持三处地图视角一致
const SHARED_VIEW_STATE = {
  longitude: 117.313,
  latitude: 42.409,
  zoom: 17,
  pitch: 45,
  bearing: 0,
};

function PeriodPanel({ year, geoJsonUrl }: { year: number; geoJsonUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<Deck | null>(null);
  const [data, setData] = useState<FeatureCollection<Geometry, TreeCrownProperties> | null>(null);

  useEffect(() => {
    fetch(geoJsonUrl)
      .then((r) => r.json())
      .then(setData)
      .catch((err) => console.error(`[DualPeriodCompare] ${year}年数据加载失败`, err));
  }, [geoJsonUrl, year]);

  // Deck实例只在挂载时创建一次,依赖数组为[]
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
      canvas: canvasEl, // 保留局部引用appendChild,不读deck.canvas(protected成员,会导致tsc报错)
      initialViewState: SHARED_VIEW_STATE,
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

  // 数据到达后,对同一个Deck实例调用setProps更新图层
  useEffect(() => {
    if (!data || !deckRef.current) return;
    deckRef.current.setProps({ layers: [buildTreeCrownExtrusionLayer(data, `period-${year}`)] });
  }, [data, year]);

  return (
    <div className="flex-1">
      <div className="mb-2 text-center font-serif text-sm text-stone-600">{year}</div>
      <WebGLGuard heightClassName="h-[45vh]">
        <div ref={containerRef} className="h-[45vh] w-full rounded-md border border-stone-300 bg-stone-50" />
      </WebGLGuard>
    </div>
  );
}

export function DualPeriodCompare() {
  return (
    <div className="flex gap-4">
      <PeriodPanel year={2018} geoJsonUrl="/data/tree-crowns/2018/overview.geojson" />
      <PeriodPanel year={2024} geoJsonUrl="/data/tree-crowns/2024/overview.geojson" />
    </div>
  );
}
