import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DualPeriodCompare } from "../DualPeriodCompare";

describe("DualPeriodCompare", () => {
  beforeEach(() => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ type: "FeatureCollection", features: [] }),
      })
    ) as unknown as typeof fetch;
  });

  it("fetches both 2018 and 2024 overview GeoJSON on mount", async () => {
    render(<DualPeriodCompare />);
    expect(fetch).toHaveBeenCalledWith("/data/tree-crowns/2018/overview.geojson");
    expect(fetch).toHaveBeenCalledWith("/data/tree-crowns/2024/overview.geojson");
  });

  it("renders two labeled map panels side by side", () => {
    render(<DualPeriodCompare />);
    expect(screen.getByText("2018")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
  });
});
