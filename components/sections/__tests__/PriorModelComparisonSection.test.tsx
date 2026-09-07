import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PriorModelComparisonSection } from "../PriorModelComparisonSection";

const mockData = [
  { config_name: "当前方案: 二次多项式+卫星光谱", per_k: { "30": { improvement_mean_pct: 40, improvement_min_pct: 20 } } },
  { config_name: "方向A: 随机森林+卫星光谱", per_k: { "30": { improvement_mean_pct: 55, improvement_min_pct: 35 } } },
];

describe("PriorModelComparisonSection", () => {
  beforeEach(() => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve(mockData) })
    ) as unknown as typeof fetch;
  });

  it("fetches prior model scenarios and renders each config name", async () => {
    render(<PriorModelComparisonSection />);
    await waitFor(() => {
      expect(screen.getByText(/当前方案/)).toBeInTheDocument();
      expect(screen.getByText(/方向A/)).toBeInTheDocument();
    });
  });
});
