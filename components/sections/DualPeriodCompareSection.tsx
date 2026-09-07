import { DualPeriodCompare } from "@/components/map/DualPeriodCompare";

export function DualPeriodCompareSection() {
  return (
    <section className="space-y-4">
      <h2 className="font-serif text-2xl font-bold text-stone-900">2018 / 2024 双期对比</h2>
      <p className="text-sm text-stone-600">左右分屏对比两期树冠地图，直观展示6年间的碳汇积累。</p>
      <DualPeriodCompare />
    </section>
  );
}
