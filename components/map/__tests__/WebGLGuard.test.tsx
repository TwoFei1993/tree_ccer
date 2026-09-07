import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WebGLGuard } from "../WebGLGuard";
import * as webglSupport from "@/lib/map/webglSupport";

describe("WebGLGuard", () => {
  it("renders children when WebGL2 is supported", () => {
    vi.spyOn(webglSupport, "isWebGL2Supported").mockReturnValue(true);
    render(
      <WebGLGuard>
        <div data-testid="real-map">地图内容</div>
      </WebGLGuard>
    );
    expect(screen.getByTestId("real-map")).toBeInTheDocument();
  });

  it("renders fallback message instead of children when WebGL2 is not supported", () => {
    vi.spyOn(webglSupport, "isWebGL2Supported").mockReturnValue(false);
    render(
      <WebGLGuard>
        <div data-testid="real-map">地图内容</div>
      </WebGLGuard>
    );
    expect(screen.queryByTestId("real-map")).not.toBeInTheDocument();
    expect(screen.getByText(/不支持 WebGL2/)).toBeInTheDocument();
  });
});
