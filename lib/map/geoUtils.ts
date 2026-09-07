import { WebMercatorViewport } from "@deck.gl/core";
import type { Polygon } from "geojson";

/** 多边形质心的简单近似:外环顶点坐标平均(排除闭合环重复的首尾点)。
 * 对20m见方的规则网格足够精确,不引入@turf/turf这类额外依赖。 */
export function polygonCentroid(polygon: Polygon): [number, number] {
  const ring = polygon.coordinates[0];
  // 闭合环的最后一个点与第一个点相同,计算平均时只取前n-1个点避免重复加权
  const points = ring.slice(0, -1);
  const sumLon = points.reduce((acc, p) => acc + p[0], 0);
  const sumLat = points.reduce((acc, p) => acc + p[1], 0);
  return [sumLon / points.length, sumLat / points.length];
}

// 塞罕坝研究区实际经纬度边界(据public/data/tree-crowns/{2018,2024}/overview.geojson
// 逐点算出,两期数据及网格碳汇数据边界完全一致)。三处地图组件共用同一份边界,
// 用它动态算出"默认全景"视角,而不是各自手动猜测固定zoom值。
export const RESEARCH_AREA_BOUNDS: [[number, number], [number, number]] = [
  [117.309887, 42.406865],
  [117.316047, 42.411429],
];

/** 用WebMercatorViewport.fitBounds()算出恰好撑满研究区边界的viewState(纯deck.gl实例专用,
 * 没有MapLibre的fitBounds便捷API)。容器尺寸变化时应重新调用,保持"默认全景"跟随resize。 */
export function fitBoundsViewState(
  width: number,
  height: number,
  bounds: [[number, number], [number, number]] = RESEARCH_AREA_BOUNDS,
  padding = 20,
): { longitude: number; latitude: number; zoom: number; pitch: number; bearing: number } {
  const viewport = new WebMercatorViewport({ width, height });
  const { longitude, latitude, zoom } = viewport.fitBounds(bounds, { padding });
  return { longitude, latitude, zoom, pitch: 0, bearing: 0 };
}
