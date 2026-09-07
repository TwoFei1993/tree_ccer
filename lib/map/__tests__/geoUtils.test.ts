import { describe, it, expect } from "vitest";
import { polygonCentroid } from "../geoUtils";
import type { Polygon } from "geojson";

describe("polygonCentroid", () => {
  it("computes centroid of a simple square as the average of its ring vertices", () => {
    // 一个正方形,四个角点坐标平均后应等于几何中心
    const square: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 2],
          [0, 0], // 闭合环,首尾重复
        ],
      ],
    };
    const [lon, lat] = polygonCentroid(square);
    expect(lon).toBeCloseTo(1, 5);
    expect(lat).toBeCloseTo(1, 5);
  });
});
