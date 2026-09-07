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
