import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { GroundTruthSection } from "../GroundTruthSection";

const mockData = {
  trees: [],
  cv_model_results: [
    { Model: "ShiftedPower_H_A", Evaluation: "K-fold out-of-fold", R2: 0.807, RMSE_cm: 2.07, rRMSE_percent: 6.52, MAE_cm: 1.74, Bias_cm: -0.006 },
  ],
  lidar_vs_field_validation: [
    { year: "2018", n: 30, rmse: 2.769, bias: -1.034, rrmse: 8.07, r2: 0.6174, mean_field_cm: 34.32, mean_lidar_cm: 33.29 },
    { year: "2024", n: 88, rmse: 2.085, bias: 0.146, rrmse: 6.53, r2: 0.762, mean_field_cm: 31.93, mean_lidar_cm: 32.07 },
  ],
};

describe("GroundTruthSection", () => {
  beforeEach(() => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve(mockData) })
    ) as unknown as typeof fetch;
  });

  it("renders the LiDAR-vs-field validation rRMSE for both years as the primary evidence", async () => {
    render(<GroundTruthSection />);
    await waitFor(() => {
      expect(screen.getByText(/8\.07/)).toBeInTheDocument();
      expect(screen.getByText(/6\.53/)).toBeInTheDocument();
    });
  });

  it("renders the DBH formula cross-validation table as clearly-labeled secondary context", async () => {
    render(<GroundTruthSection />);
    await waitFor(() => {
      expect(screen.getByText(/6\.52/)).toBeInTheDocument();
    });
    // 两组数字必须有明确的区分标注,不能只靠数值大小让读者自己猜
    // (换算公式出现在标题和说明段落两处,用 getAllByText 避免多重匹配报错)
    expect(screen.getAllByText(/换算公式/).length).toBeGreaterThan(0);
  });

  it("renders the diagnostic images", () => {
    render(<GroundTruthSection />);
    expect(screen.getByAltText(/观测值.*预测值|observed/i)).toBeInTheDocument();
  });
});
