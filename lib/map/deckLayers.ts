import { AmbientLight, DirectionalLight, LightingEffect } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { TreeCrownProperties } from "@/lib/types/geo";

/** 树冠挤出体的材质:提高diffuse让侧面/顶面的明暗层次更明显(默认0.6太扁平,挤出的"盒子感"
 * 很重),適度shininess给顶面一点高光但不做成塑料质感。配合下面的LightingEffect(带方向光的
 * 阴影投射角度)才能让"树冠群"在倾斜视角下看出真实的体积起伏,而不是一片平涂色块堆叠。 */
export const TREE_CROWN_MATERIAL = {
  ambient: 0.4,
  diffuse: 0.7,
  shininess: 24,
  specularColor: [60, 70, 55] as [number, number, number],
};

/** 统一的场景光照:环境光负责基础可见度,方向光模拟斜射阳光在树冠群之间投出深浅不一的阴影,
 * 是让挤出的树冠"看起来是立体的森林"而不是"扁平色块叠起来的柱状图"最关键的一步——单纯的
 * 挤出高度差在没有方向光的情况下,顶面色块几乎一样亮,肉眼很难分辨相邻树冠的高度差异。 */
export function buildTreeCrownLightingEffect(): LightingEffect {
  const ambientLight = new AmbientLight({ color: [255, 255, 255], intensity: 1.1 });
  const sunLight = new DirectionalLight({
    color: [255, 250, 235],
    intensity: 2.2,
    direction: [-2, -3, -1], // 斜射方向,让每棵树冠朝内一侧产生阴影,凸显挤出体的立体感
  });
  return new LightingEffect({ ambientLight, sunLight });
}

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
// 塞罕坝当地树种正常高度上限约27-30米(见2018年最高树27.5米,分布连续无断层)。2024年数据里
// 有一棵标注43.057米的树,其冠幅(55.25m²)、胸径(54.62cm)同样远超其余样本的中位数
// (分别约2.5倍、1.7倍)——三个指标同时异常且互相印证,符合"LiDAR树冠分割算法把相邻多棵树
// 误合并识别成一棵"的典型特征,是源数据的分割误差,不是本站计算逻辑引入的bug(已用原始
// shapefile核对,异常值在源头就存在)。展示层不改这棵树的高度数值本身(保留数据真实性),
// 只对拉伸高度做视觉封顶,避免它把整片树冠群的挤出高度视觉比例拉得只剩它自己看得清。
const VISUAL_HEIGHT_CAP_M = 30;

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
    material: TREE_CROWN_MATERIAL,
    getElevation: (f: Feature<Geometry, TreeCrownProperties>) =>
      heightToElevation(Math.min(f.properties.top_h_m ?? 0, VISUAL_HEIGHT_CAP_M), HEIGHT_EXAGGERATION),
    getFillColor: (f: Feature<Geometry, TreeCrownProperties>) =>
      carbonToColor(f.properties.Carbon_kg ?? 0, MAX_CARBON_KG_FOR_COLOR_SCALE),
    getLineColor: [70, 85, 65, 90], // 描边加深、透明度调低,倾斜视角下勾勒出每棵树冠的轮廓,避免相邻树冠色块糊成一片
    lineWidthMinPixels: 0.6,
    pickable: true,
    transitions: {
      getElevation: 400,
      getFillColor: 400,
    },
  });
}
