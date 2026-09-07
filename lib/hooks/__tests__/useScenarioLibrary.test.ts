import { describe, it, expect } from "vitest";
import { findScenario, findNearestKOnGrid } from "../useScenarioLibrary";
import type { KCalSizeScenario } from "@/lib/types/scenario";

const mockScenarios: KCalSizeScenario[] = [
  { k: 30, cal_size: 200, sigma2: 1, ell_m: 10, rmse_m4: 1.0, rmse_m1: 1.8, improvement_pct: 44.4, sample_grid_ids: [1, 2, 3], corrected_surface: [], corrected_surface_grid_ids: [] },
  { k: 120, cal_size: 200, sigma2: 1, ell_m: 10, rmse_m4: 0.5, rmse_m1: 1.5, improvement_pct: 66.7, sample_grid_ids: [4, 5, 6], corrected_surface: [], corrected_surface_grid_ids: [] },
];

describe("findScenario", () => {
  it("returns exact match when (k, cal_size) exists in grid", () => {
    const result = findScenario(mockScenarios, 30, 200);
    expect(result?.improvement_pct).toBe(44.4);
  });

  it("returns undefined when combination not in precomputed grid", () => {
    const result = findScenario(mockScenarios, 99, 200);
    expect(result).toBeUndefined();
  });
});

describe("findNearestKOnGrid", () => {
  it("snaps to nearest available k when user drags slider to an off-grid value", () => {
    const availableKs = [30, 120];
    expect(findNearestKOnGrid(availableKs, 100)).toBe(120);
    expect(findNearestKOnGrid(availableKs, 40)).toBe(30);
  });
});
