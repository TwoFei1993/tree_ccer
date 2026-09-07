import { HeroSection } from "@/components/sections/HeroSection";
import { MethodologySection } from "@/components/sections/MethodologySection";
import { InteractiveModelPanelSection } from "@/components/sections/InteractiveModelPanelSection";
import { PriorModelComparisonSection } from "@/components/sections/PriorModelComparisonSection";
import { DualPeriodCompareSection } from "@/components/sections/DualPeriodCompareSection";
import { GroundTruthSection } from "@/components/sections/GroundTruthSection";
import { LimitationsSection } from "@/components/sections/LimitationsSection";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl space-y-20 p-6 py-12 md:p-12">
      <HeroSection />
      <MethodologySection />
      <InteractiveModelPanelSection />
      <PriorModelComparisonSection />
      <DualPeriodCompareSection />
      <GroundTruthSection />
      <LimitationsSection />
    </main>
  );
}
