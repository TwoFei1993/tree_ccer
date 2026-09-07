import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ParameterPanel } from "../ParameterPanel";

const K_GRID = [30, 50, 80, 120, 200];
const CAL_SIZE_GRID = [150, 200, 250, 300];
const PRIOR_MODEL_NAMES = ["当前方案: 二次多项式+卫星光谱", "方向A: 随机森林+卫星光谱"];

describe("ParameterPanel", () => {
  it("renders current k and calibration size values", () => {
    render(
      <ParameterPanel
        kGrid={K_GRID}
        calSizeGrid={CAL_SIZE_GRID}
        priorModelNames={PRIOR_MODEL_NAMES}
        selectedK={80}
        selectedCalSize={200}
        selectedPriorModel={PRIOR_MODEL_NAMES[0]}
        onKChange={vi.fn()}
        onCalSizeChange={vi.fn()}
        onPriorModelChange={vi.fn()}
      />
    );
    expect(screen.getByText(/80/)).toBeInTheDocument();
    expect(screen.getByText(/200/)).toBeInTheDocument();
  });

  it("snaps dragged k slider value to nearest grid point before calling onKChange", () => {
    const onKChange = vi.fn();
    render(
      <ParameterPanel
        kGrid={K_GRID}
        calSizeGrid={CAL_SIZE_GRID}
        priorModelNames={PRIOR_MODEL_NAMES}
        selectedK={80}
        selectedCalSize={200}
        selectedPriorModel={PRIOR_MODEL_NAMES[0]}
        onKChange={onKChange}
        onCalSizeChange={vi.fn()}
        onPriorModelChange={vi.fn()}
      />
    );
    const kSlider = screen.getByLabelText(/监测样本量/);
    fireEvent.change(kSlider, { target: { value: "95" } }); // 95最接近网格点80(相距15)还是120(相距25)->吸附到80
    expect(onKChange).toHaveBeenCalledWith(80);
  });

  it("calls onPriorModelChange when a different prior model option is selected", () => {
    const onPriorModelChange = vi.fn();
    render(
      <ParameterPanel
        kGrid={K_GRID}
        calSizeGrid={CAL_SIZE_GRID}
        priorModelNames={PRIOR_MODEL_NAMES}
        selectedK={80}
        selectedCalSize={200}
        selectedPriorModel={PRIOR_MODEL_NAMES[0]}
        onKChange={vi.fn()}
        onCalSizeChange={vi.fn()}
        onPriorModelChange={onPriorModelChange}
      />
    );
    fireEvent.change(screen.getByLabelText(/先验模型/), { target: { value: PRIOR_MODEL_NAMES[1] } });
    expect(onPriorModelChange).toHaveBeenCalledWith(PRIOR_MODEL_NAMES[1]);
  });
});
