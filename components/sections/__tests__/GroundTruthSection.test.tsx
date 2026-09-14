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

  it("renders only the 2024 LiDAR-vs-field validation as the primary evidence", async () => {
    render(<GroundTruthSection />);
    await waitFor(() => {
      // 2024年这一期是论文§2.2引用的验证证据
      expect(screen.getByText(/6\.53/)).toBeInTheDocument();
      expect(screen.getByText(/≤10%, no deduction/)).toBeInTheDocument();
    });
    // 2018年数据不再展示(论文§3.5: 2018表格系2024数据反推,不构成独立证据)
    expect(screen.queryByText(/8\.07/)).not.toBeInTheDocument();
  });

  it("renders the DBH formula cross-validation table as clearly-labeled secondary context", async () => {
    render(<GroundTruthSection />);
    await waitFor(() => {
      expect(screen.getByText(/6\.52/)).toBeInTheDocument();
    });
    // 两组数字必须有明确的区分标注(英文版用"conversion formula"标注辅助性质)
    expect(screen.getAllByText(/conversion formula/i).length).toBeGreaterThan(0);
  });

  it("renders the diagnostic images", () => {
    render(<GroundTruthSection />);
    expect(screen.getByAltText(/observed vs predicted/i)).toBeInTheDocument();
  });
});
