"use client";

import { useEffect, useRef, useState } from "react";
import { Deck } from "@deck.gl/core";
import type { FeatureCollection, Geometry } from "geojson";
import type { TreeCrownProperties } from "@/lib/types/geo";
import { buildTreeCrownExtrusionLayer } from "@/lib/map/deckLayers";

const SHARED_VIEW_STATE = {
  longitude: 117.31,
  latitude: 42.408,
  zoom: 15,
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
    const canvasEl = document.createElement("canvas");
    const deck = new Deck({
      canvas: canvasEl, // 保留局部引用appendChild,不读deck.canvas(protected成员,会导致tsc报错)
      initialViewState: SHARED_VIEW_STATE,
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

  // 数据到达后,对同一个Deck实例调用setProps更新图层
  useEffect(() => {
    if (!data || !deckRef.current) return;
    deckRef.current.setProps({ layers: [buildTreeCrownExtrusionLayer(data, `period-${year}`)] });
  }, [data, year]);

  return (
    <div className="flex-1">
      <div className="mb-2 text-center font-serif text-sm text-stone-600">{year}</div>
      <div ref={containerRef} className="h-[45vh] w-full rounded-md border border-stone-300 bg-stone-50" />
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
