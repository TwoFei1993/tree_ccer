import { describe, it, expect } from "vitest";
import { buildTreeCrownExtrusionLayer, heightToElevation } from "../deckLayers";

describe("heightToElevation", () => {
  it("scales real tree height (meters) by exaggeration factor for visible extrusion", () => {
    // 研究区树高范围6.3-43.1米(见事实核对表),真实米数直接挤出在地图尺度上几乎不可见,需要夸张系数
    expect(heightToElevation(10, 5)).toBe(50);
    expect(heightToElevation(0, 5)).toBe(0);
  });
});

describe("buildTreeCrownExtrusionLayer", () => {
  it("builds a GeoJsonLayer config with extrusion enabled and correct id", () => {
    const geojson = { type: "FeatureCollection" as const, features: [] };
    const layer = buildTreeCrownExtrusionLayer(geojson, "overview-2024");
    expect(layer.id).toBe("tree-crowns-overview-2024");
    // deck.gl layer实例的props通过.props访问
    expect(layer.props.extruded).toBe(true);
    expect(layer.props.getElevation).toBeInstanceOf(Function);
  });
});
