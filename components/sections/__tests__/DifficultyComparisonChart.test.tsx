import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DifficultyComparisonChart } from "../DifficultyComparisonChart";

describe("DifficultyComparisonChart", () => {
  it("renders labels for both carbon stock and carbon increment metrics", () => {
    render(<DifficultyComparisonChart />);
    expect(screen.getByText(/碳储量/)).toBeInTheDocument();
    expect(screen.getByText(/碳汇增量/)).toBeInTheDocument();
  });
});
