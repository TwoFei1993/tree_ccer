import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScenarioMetricsCard } from "../ScenarioMetricsCard";
import type { KCalSizeScenario } from "@/lib/types/scenario";

const mockScenario: KCalSizeScenario = {
  k: 30, cal_size: 200, sigma2: 1.2, ell_m: 12.5,
  rmse_m4: 1.05, rmse_m1: 1.85, improvement_pct: 43.2,
  sample_grid_ids: [1, 2, 3],
  corrected_surface: [], corrected_surface_grid_ids: [],
};

describe("ScenarioMetricsCard", () => {
  it("renders RMSE and improvement percentage for a valid scenario", () => {
    render(<ScenarioMetricsCard scenario={mockScenario} />);
    expect(screen.getByText(/43\.2/)).toBeInTheDocument();
    expect(screen.getByText(/1\.05/)).toBeInTheDocument();
  });

  it("shows a fallback message when scenario is undefined (combination not precomputed)", () => {
    render(<ScenarioMetricsCard scenario={undefined} />);
    expect(screen.getByText(/暂无该参数组合的预计算结果/)).toBeInTheDocument();
  });
});
