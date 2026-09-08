"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { TreeCrownMap } from "@/components/map/TreeCrownMap";
import { KeyFindingsCard } from "./KeyFindingsCard";

export function HeroSection() {
  // 渐入动效:mounted从false变true触发CSS transition,避免首屏内容硬性跳出(设计文档要求)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="space-y-8">
      <div
        className={`transition-opacity duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}
      >
        <h1 className="font-serif text-3xl font-bold text-stone-900 md:text-4xl">
          塞罕坝碳汇 MRV 空间误差抽样研究
        </h1>
        <p className="mt-3 max-w-2xl text-stone-600">
          面向 CCER 造林碳汇项目的独立校准集与监测池两阶段抽样协议：
          用少量地面样点，结合 Kriging 空间误差场重建，显著降低碳汇增量估计的不确定性。
        </p>
      </div>

      <div
        className={`transition-opacity delay-200 duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}
      >
        <Image
          src="/images/study_area_location.jpg"
          alt="研究区位置图：从全国到河北承德围场（塞罕坝）到具体样地的四级区位定位"
          width={1600}
          height={1552}
          priority
          className="w-full rounded-md border border-stone-300"
        />
        <p className="figure-caption">
          图 1 · 塞罕坝研究区区位图：A 全国范围内的省级位置，B 省内的县级位置，C 样地在林场遥感影像中的具体位置，D
          县域范围内样地的相对位置
        </p>
      </div>

      <div
        className={`transition-opacity delay-300 duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}
      >
        <TreeCrownMap overviewGeoJsonUrl="/data/tree-crowns/2024/overview.geojson" />
        <p className="figure-caption">图 2 · 塞罕坝研究区单木树冠倾斜俯视图（2024年，按树高挤出，颜色映射单株碳储量）</p>
      </div>

      <div className={`transition-opacity delay-500 duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}>
        <KeyFindingsCard />
      </div>
    </section>
  );
}
