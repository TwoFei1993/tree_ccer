import { InteractiveModelSection } from "@/components/panel/InteractiveModelSection";

export function InteractiveModelPanelSection() {
  return (
    <section className="space-y-4">
      <h2 className="font-serif text-2xl font-bold text-stone-900">交互模型面板</h2>
      <p className="text-sm text-stone-600">
        拖动下方滑块，探索不同监测样本量 k 与校准集规模下的抽样精度。
        以下抽样点位与误差修正效果基于20m网格样地（与首屏的单木级树冠地图分属不同分辨率的可视化）。
      </p>
      <InteractiveModelSection />
    </section>
  );
}
