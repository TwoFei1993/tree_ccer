import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KeyFindingsCard } from "../KeyFindingsCard";

describe("KeyFindingsCard", () => {
  it("displays the three headline numbers from the 2024 stock-mapping paper", () => {
    render(<KeyFindingsCard />);
    // 论文Table 2: n=27回归族RMSE改善27.4%(17.29→12.55 t C/ha)
    expect(screen.getByText(/27\.4%/)).toBeInTheDocument();
    // §4.2: 三个优化样点 ≈ 六个随机样点,验证效率约2倍
    expect(screen.getByText(/2×/)).toBeInTheDocument();
    // §2.2: 2024年LiDAR DBH vs 地面实测 rRMSE = 6.5%
    expect(screen.getByText(/6\.5%/)).toBeInTheDocument();
  });
});
