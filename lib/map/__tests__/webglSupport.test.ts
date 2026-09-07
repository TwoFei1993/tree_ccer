import { describe, it, expect, vi } from "vitest";
import { isWebGL2Supported } from "../webglSupport";

describe("isWebGL2Supported", () => {
  it("returns true when canvas.getContext('webgl2') returns a context", () => {
    const mockContext = {};
    vi.spyOn(document, "createElement").mockReturnValue({
      getContext: () => mockContext,
    } as unknown as HTMLCanvasElement);
    expect(isWebGL2Supported()).toBe(true);
  });

  it("returns false when canvas.getContext('webgl2') returns null", () => {
    vi.spyOn(document, "createElement").mockReturnValue({
      getContext: () => null,
    } as unknown as HTMLCanvasElement);
    expect(isWebGL2Supported()).toBe(false);
  });
});
