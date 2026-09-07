"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Geometry } from "geojson";
import type { TreeCrownProperties } from "@/lib/types/geo";
import { buildTreeCrownExtrusionLayer } from "@/lib/map/deckLayers";
import { MapSkeleton } from "@/components/ui/MapSkeleton";
import { WebGLGuard } from "@/components/map/WebGLGuard";
import { RESEARCH_AREA_BOUNDS } from "@/lib/map/geoUtils";

// 用fitBounds让初始视角精确撑满整个研究区("默认全景"),而不是用手动猜测的固定zoom值近似
// ——避免不同容器宽高比下研究区被裁掉一部分。边界坐标定义在geoUtils.ts,三处地图组件共用。
const INITIAL_PITCH = 45; // 倾斜2.5D视角,对应设计文档"倾斜俯视+挤出高度"
const INITIAL_BEARING = 0;

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

    // 构造时不传pitch:MapLibre的bounds/fitBoundsOptions在计算"恰好装下边界"的zoom时,
    // 并未正确考虑pitch(倾斜视角下同一段地面在屏幕上投影更小,实测zoom=45°倾斜时算出的
    // zoom比pitch=0时保守了近2个级别,导致研究区只占了视口一小部分——这是MapLibre/
    // Mapbox-gl的已知限制,fitBounds系列API不支持带pitch精确计算)。先在pitch=0下让
    // fitBounds算出正确撑满边界的zoom,地图加载完成后再单独setPitch(45)切换倾斜视角,
    // 这样倾斜后的"视觉全景"效果才跟俯视时的边界框保持一致(2.5D倾斜下自然会露出一些
    // 边界外的地面,这是符合预期的透视效果,不是裁剪问题)。
    const map = new maplibregl.Map({
      container: mapContainerEl,
      style: "https://demotiles.maplibre.org/style.json",
      pitch: 0,
      bearing: INITIAL_BEARING,
      bounds: RESEARCH_AREA_BOUNDS,
      fitBoundsOptions: { padding: 20 }, // 留一点边距,避免树冠贴着容器边缘裁切
    });
    map.setPitch(INITIAL_PITCH);

    // 缩放按钮(NavigationControl):默认视角已经是fitBounds撑满全景,专家仍可能想放大看单株细节
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

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
