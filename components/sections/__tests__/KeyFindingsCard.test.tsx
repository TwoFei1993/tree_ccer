import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KeyFindingsCard } from "../KeyFindingsCard";

describe("KeyFindingsCard", () => {
  it("displays the three headline numbers from the research report", () => {
    render(<KeyFindingsCard />);
    expect(screen.getByText(/32%/)).toBeInTheDocument();
    expect(screen.getByText(/57%/)).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
    expect(screen.getByText(/180/)).toBeInTheDocument();
    expect(screen.getByText(/6\.5%/)).toBeInTheDocument();
    expect(screen.getByText(/8\.1%/)).toBeInTheDocument();
  });
});
