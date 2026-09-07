import { GeoJsonLayer } from "@deck.gl/layers";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { TreeCrownProperties } from "@/lib/types/geo";

/** 把真实树高(米)按夸张系数放大成deck.gl的elevation值,否则真实米数在地图尺度上视觉上几乎扁平 */
export function heightToElevation(heightM: number, exaggeration: number): number {
  return heightM * exaggeration;
}

/** 学术报告基调的碳储量色阶:低碳储量用浅米绿,高碳储量用深墨绿,避免饱和度过高的"科技感"配色 */
function carbonToColor(carbonKg: number, maxCarbonKg: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, carbonKg / maxCarbonKg));
  const light: [number, number, number] = [212, 224, 199]; // 浅米绿
  const dark: [number, number, number] = [45, 90, 45]; // 深墨绿
  return [
    Math.round(light[0] + (dark[0] - light[0]) * t),
    Math.round(light[1] + (dark[1] - light[1]) * t),
    Math.round(light[2] + (dark[2] - light[2]) * t),
  ];
}

const HEIGHT_EXAGGERATION = 6;
// 研究区树冠Carbon_kg最大观测值约882(见事实核对表2024年数据),用作色阶归一化上限
const MAX_CARBON_KG_FOR_COLOR_SCALE = 900;

export function buildTreeCrownExtrusionLayer(
  data: FeatureCollection<Geometry, TreeCrownProperties>,
  layerIdSuffix: string
): GeoJsonLayer {
  return new GeoJsonLayer({
    id: `tree-crowns-${layerIdSuffix}`,
    data,
    extruded: true,
    wireframe: false,
    filled: true,
    getElevation: (f: Feature<Geometry, TreeCrownProperties>) =>
      heightToElevation(f.properties.top_h_m ?? 0, HEIGHT_EXAGGERATION),
    getFillColor: (f: Feature<Geometry, TreeCrownProperties>) =>
      carbonToColor(f.properties.Carbon_kg ?? 0, MAX_CARBON_KG_FOR_COLOR_SCALE),
    getLineColor: [90, 110, 90, 120],
    lineWidthMinPixels: 0.5,
    pickable: true,
    transitions: {
      getElevation: 400,
      getFillColor: 400,
    },
  });
}
