import { HeroSection } from "@/components/sections/HeroSection";
import { MethodologySection } from "@/components/sections/MethodologySection";
import { SamplingDesignSection } from "@/components/sections/SamplingDesignSection";
import { ResultsSection } from "@/components/sections/ResultsSection";
import { SupplementarySection } from "@/components/sections/SupplementarySection";
import { GroundTruthSection } from "@/components/sections/GroundTruthSection";
import { LimitationsSection } from "@/components/sections/LimitationsSection";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl space-y-20 p-6 py-12 md:p-12">
      <HeroSection />
      <MethodologySection />
      <SamplingDesignSection />
      <ResultsSection />
      <SupplementarySection />
      <GroundTruthSection />
      <LimitationsSection />
    </main>
  );
}
