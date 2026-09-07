"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import maplibregl from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";
import type { TreeCrownProperties } from "@/lib/types/geo";
import { buildTreeCrownExtrusionLayer } from "@/lib/map/deckLayers";
import { MapSkeleton } from "@/components/ui/MapSkeleton";
import { WebGLGuard } from "@/components/map/WebGLGuard";

// 塞罕坝研究区中心点(WGS84经纬度,据事实核对表UTM边界换算的大致中心)。
// 研究区实际范围约500m x 500m(经度跨度~0.006°,纬度跨度~0.0046°),zoom=15是城市街区级
// 精度、对这个尺度太粗——树冠图层会缩小到几个像素,视觉上被demotiles底图的陆地填色完全
// 淹没(实测确认:zoom=15/pitch=45下树冠色阶像素占比<1%,zoom=17/pitch=0下占比62%)。
const INITIAL_VIEW_STATE = {
  longitude: 117.313,
  latitude: 42.409,
  zoom: 17,
  pitch: 45, // 倾斜2.5D视角,对应设计文档"倾斜俯视+挤出高度"
  bearing: 0,
};

interface TreeCrownMapProps {
  overviewGeoJsonUrl: string;
}

export function TreeCrownMap({ overviewGeoJsonUrl }: TreeCrownMapProps) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [data, setData] = useState<FeatureCollection<Geometry, TreeCrownProperties> | null>(null);
  // MapLibre style是否已加载完成(map.style._loaded)。interleaved模式下deck.gl把图层
  // 通过map.addLayer()真正插入mapbox样式栈,而resolveLayerGroups在style未加载完成时
  // 会静默跳过插入且不重试——如果本地GeoJSON(同步快)比远程style.json(异步慢)先到达,
  // 图层会被静默丢弃,树冠地图只剩空底图。用mapLoaded状态显式等待"load"事件后才setProps。
  const [mapLoaded, setMapLoaded] = useState(false);
  // 用回调ref+state代替useRef:数据未加载时不渲染真实容器div(显示骨架屏),
  // 容器真正挂载到DOM时才会触发state更新,下面初始化地图的effect依赖这个state而非空数组
  const [mapContainerEl, setMapContainerEl] = useState<HTMLDivElement | null>(null);
  const mapContainerCallbackRef = useCallback((el: HTMLDivElement | null) => {
    setMapContainerEl(el);
  }, []);

  useEffect(() => {
    fetch(overviewGeoJsonUrl)
      .then((r) => r.json())
      .then(setData)
      .catch((err) => console.error("[TreeCrownMap] 加载概览图层失败", err));
  }, [overviewGeoJsonUrl]);

  // 创建MapLibre地图 + MapboxOverlay,依赖真实DOM容器节点(而非空数组):
  // 骨架屏阶段容器不存在时effect直接跳过,骨架屏消失、真实容器挂载后重新触发
  useEffect(() => {
    if (!mapContainerEl) return;

    const map = new maplibregl.Map({
      container: mapContainerEl,
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
    map.once("load", () => setMapLoaded(true));

    mapRef.current = map;
    overlayRef.current = overlay;

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
      setMapLoaded(false);
    };
  }, [mapContainerEl]);

  // 数据到达且地图style已加载完成后,才对overlay调用setProps更新图层(触发transitions配置的
  // 平滑过渡)。两个条件缺一不可:提前setProps会被resolveLayerGroups静默丢弃且不会自动重试。
  useEffect(() => {
    if (!data || !mapLoaded || !overlayRef.current) return;
    overlayRef.current.setProps({
      layers: [buildTreeCrownExtrusionLayer(data, "overview")],
    });
  }, [data, mapLoaded]);

  return (
    <WebGLGuard>
      {!data ? (
        <MapSkeleton />
      ) : (
        <div
          ref={mapContainerCallbackRef}
          className="h-[70vh] w-full rounded-md border border-stone-300 bg-stone-50"
          data-testid="tree-crown-map"
        />
      )}
    </WebGLGuard>
  );
}
