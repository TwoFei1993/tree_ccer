import { ScatterplotLayer } from "@deck.gl/layers";
import type { FeatureCollection, Polygon } from "geojson";
import type { GridCarbonProperties } from "@/lib/types/geo";
import { polygonCentroid } from "./geoUtils";

export interface SamplePoint {
  gridId: number;
  position: [number, number];
}

/** 把场景数据里的Grid_ID列表转成地图可绘制的点(取该网格多边形质心)。
 * 找不到对应网格的ID会被跳过(不应发生,但防止数据不一致时整体渲染失败)。 */
export function gridIdsToPoints(
  grid: FeatureCollection<Polygon, GridCarbonProperties>,
  gridIds: number[]
): SamplePoint[] {
  const byId = new Map(grid.features.map((f) => [f.properties.Grid_ID, f]));
  const points: SamplePoint[] = [];
  for (const id of gridIds) {
    const feature = byId.get(id);
    if (!feature) continue;
    points.push({ gridId: id, position: polygonCentroid(feature.geometry) });
  }
  return points;
}

/** 学术报告基调的抽样点标记:深墨绿描边的浅色圆点,与地图整体配色呼应,不用突兀的高亮色 */
export function buildSamplePointsLayer(points: SamplePoint[], layerIdSuffix: string): ScatterplotLayer {
  return new ScatterplotLayer({
    id: `sample-points-${layerIdSuffix}`,
    data: points,
    getPosition: (d: SamplePoint) => d.position,
    getRadius: 8,
    radiusUnits: "pixels",
    getFillColor: [245, 236, 210, 220],
    getLineColor: [45, 90, 45, 255],
    lineWidthMinPixels: 1.5,
    stroked: true,
    filled: true,
    pickable: true,
    transitions: {
      getPosition: 400,
    },
  });
}
