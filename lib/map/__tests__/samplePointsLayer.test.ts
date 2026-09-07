import { describe, it, expect } from "vitest";
import { buildSamplePointsLayer, gridIdsToPoints } from "../samplePointsLayer";
import type { FeatureCollection, Polygon } from "geojson";
import type { GridCarbonProperties } from "@/lib/types/geo";

const mockGrid: FeatureCollection<Polygon, GridCarbonProperties> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        Grid_ID: 1, Row: 1, Col: 1, Area_m2: 400,
        Carbon_tha_18: 10, Carbon_tha_24: 12, dC: 2, NDVI: 0.5, NIRv: 0.3,
      },
      geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    },
    {
      type: "Feature",
      properties: {
        Grid_ID: 2, Row: 1, Col: 2, Area_m2: 400,
        Carbon_tha_18: 8, Carbon_tha_24: 9, dC: 1, NDVI: 0.4, NIRv: 0.2,
      },
      geometry: { type: "Polygon", coordinates: [[[10, 10], [11, 10], [11, 11], [10, 11], [10, 10]]] },
    },
  ],
};

describe("gridIdsToPoints", () => {
  it("maps a list of Grid_IDs to their polygon centroids, skipping unknown IDs", () => {
    const points = gridIdsToPoints(mockGrid, [1, 2, 999]);
    expect(points).toHaveLength(2); // Grid_ID=999不存在,应被跳过而非报错
    expect(points[0].position).toEqual([0.5, 0.5]);
    expect(points[1].position).toEqual([10.5, 10.5]);
  });
});

describe("buildSamplePointsLayer", () => {
  it("builds a ScatterplotLayer config from sample points", () => {
    const points = gridIdsToPoints(mockGrid, [1, 2]);
    const layer = buildSamplePointsLayer(points, "k30-cal200");
    expect(layer.id).toBe("sample-points-k30-cal200");
    expect(layer.props.data).toHaveLength(2);
  });
});
