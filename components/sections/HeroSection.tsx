"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { TreeCrownMap } from "@/components/map/TreeCrownMap";
import { KeyFindingsCard } from "./KeyFindingsCard";

export function HeroSection() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="space-y-8">
      <div
        className={`transition-opacity duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}
      >
        <h1 className="font-serif text-3xl font-bold text-stone-900 md:text-4xl">
          From Sampling the Forest to Sampling the Error
        </h1>
        <p className="mt-1 font-serif text-lg text-stone-600 md:text-xl">
          A Spatial Sampling Decision Framework for Trustworthy Forest Carbon-Stock Accounting
        </p>
        <p className="mt-3 max-w-2xl text-stone-600">
          How should a limited verification budget be spent when every candidate plot competes to
          reduce uncertainty? On 576 fixed 20 m × 20 m LiDAR plots at Saihanba, we treat sampling
          as a decision problem in the error field rather than in the forest, and show that
          aligning plot placement with the error structure roughly doubles verification sample
          efficiency.
        </p>
      </div>

      <div
        className={`transition-opacity delay-200 duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}
      >
        <Image
          src="/images/study_area_location.jpg"
          alt="Study area location: from national to county level down to the specific Saihanba plots"
          width={1600}
          height={1552}
          className="w-full rounded-md border border-stone-300"
        />
        <p className="figure-caption">
          Figure 1 · Saihanba study area: (A) province-level location within China, (B) county-level
          location within the province, (C) plot location within the forest-farm remotely sensed
          imagery, (D) plot position within the county
        </p>
      </div>

      <div
        className={`transition-opacity delay-300 duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}
      >
        <TreeCrownMap overviewGeoJsonUrl="/data/tree-crowns/2024/overview.geojson" />
        <p className="figure-caption">
          Figure 2 · Tilted top-down view of individual tree crowns in the study area (2024,
          extruded by tree height, colored by per-tree carbon stock)
        </p>
      </div>

      <div className={`transition-opacity delay-500 duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}>
        <KeyFindingsCard />
      </div>
    </section>
  );
}
