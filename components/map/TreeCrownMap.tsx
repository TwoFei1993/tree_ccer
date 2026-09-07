"use client";

import { useEffect, useRef, useState } from "react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import maplibregl from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";
import type { TreeCrownProperties } from "@/lib/types/geo";
import { buildTreeCrownExtrusionLayer } from "@/lib/map/deckLayers";

// 塞罕坝研究区中心点(WGS84经纬度,据事实核对表UTM边界换算的大致中心)
const INITIAL_VIEW_STATE = {
  longitude: 117.31,
  latitude: 42.408,
  zoom: 15,
  pitch: 45, // 倾斜2.5D视角,对应设计文档"倾斜俯视+挤出高度"
  bearing: 0,
};

interface TreeCrownMapProps {
  overviewGeoJsonUrl: string;
}

export function TreeCrownMap({ overviewGeoJsonUrl }: TreeCrownMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [data, setData] = useState<FeatureCollection<Geometry, TreeCrownProperties> | null>(null);

  useEffect(() => {
    fetch(overviewGeoJsonUrl)
      .then((r) => r.json())
      .then(setData)
      .catch((err) => console.error("[TreeCrownMap] 加载概览图层失败", err));
  }, [overviewGeoJsonUrl]);

  // 挂载时创建一次MapLibre地图 + MapboxOverlay,依赖数组为[]
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
      zoom: INITIAL_VIEW_STATE.zoom,
      pitch: INITIAL_VIEW_STATE.pitch,
      bearing: INITIAL_VIEW_STATE.bearing,
    });

    // MapboxOverlay作为MapLibre的IControl添加,deck.gl图层与底图共享同一个canvas和视角状态,
    // 不再需要手动同步viewState,也不需要自己创建/挂载canvas
    const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    map.addControl(overlay as unknown as maplibregl.IControl);

    mapRef.current = map;
    overlayRef.current = overlay;

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  // 数据到达后,对同一个overlay调用setProps更新图层,触发transitions配置的平滑过渡
  useEffect(() => {
    if (!data || !overlayRef.current) return;
    overlayRef.current.setProps({
      layers: [buildTreeCrownExtrusionLayer(data, "overview")],
    });
  }, [data]);

  return (
    <div
      ref={mapContainerRef}
      className="h-[70vh] w-full rounded-md border border-stone-300 bg-stone-50"
      data-testid="tree-crown-map"
    />
  );
}
