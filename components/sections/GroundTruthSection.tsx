"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { GroundTruthData } from "@/lib/types/geo";

export function GroundTruthSection() {
  const [data, setData] = useState<GroundTruthData | null>(null);

  useEffect(() => {
    fetch("/data/ground-truth-dbh.json")
      .then((r) => r.json())
      .then(setData)
      .catch((err) => console.error("[GroundTruthSection] 数据加载失败", err));
  }, []);

  return (
    <section className="space-y-6">
      <h2 className="font-serif text-2xl font-bold text-stone-900">地面实测验证</h2>

      <div>
        <h3 className="font-serif text-lg font-semibold text-stone-900">
          LiDAR估算 vs 地面实测：CCER表35要求的直接验证
        </h3>
        <p className="mt-1 text-sm text-stone-600">
          101棵地面实测单木，用几何相交（IoU&gt;0.5）与LiDAR树冠图层逐一匹配，比对LiDAR最终估算的DBH与地面实测DBH。
        </p>
        {data && (
          <div className="mt-3 overflow-x-auto rounded-md border border-stone-300 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-left text-stone-600">
                <tr>
                  <th className="p-3">年份</th>
                  <th className="p-3">匹配样本数 n</th>
                  <th className="p-3">RMSE (cm)</th>
                  <th className="p-3">相对RMSE (%)</th>
                  <th className="p-3">R²</th>
                  <th className="p-3">CCER表35判定</th>
                </tr>
              </thead>
              <tbody>
                {data.lidar_vs_field_validation.map((r) => (
                  <tr key={r.year} className="border-t border-stone-200">
                    <td className="p-3 font-medium">{r.year}</td>
                    <td className="p-3">{r.n}</td>
                    <td className="p-3">{r.rmse.toFixed(2)}</td>
                    <td className="p-3 font-semibold text-emerald-800">{r.rrmse.toFixed(2)}%</td>
                    <td className="p-3">{r.r2.toFixed(3)}</td>
                    <td className="p-3">{r.rrmse <= 10 ? "≤10%，不扣减" : "需扣减"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-serif text-lg font-semibold text-stone-900">
          辅助说明：DBH换算公式（树高+冠幅→胸径）本身的交叉验证
        </h3>
        <p className="mt-1 text-sm text-stone-600">
          以下是4个候选换算公式的选型依据，衡量的是公式拟合质量，<strong>不是</strong>上方CCER表35意义上的地面验证证据。
        </p>
        {data && (
          <div className="mt-3 overflow-x-auto rounded-md border border-stone-300 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-left text-stone-600">
                <tr>
                  <th className="p-3">模型</th>
                  <th className="p-3">R²</th>
                  <th className="p-3">RMSE (cm)</th>
                  <th className="p-3">相对RMSE (%)</th>
                  <th className="p-3">MAE (cm)</th>
                </tr>
              </thead>
              <tbody>
                {data.cv_model_results.map((r) => (
                  <tr key={r.Model} className="border-t border-stone-200">
                    <td className="p-3 font-medium">{r.Model}</td>
                    <td className="p-3">{r.R2.toFixed(3)}</td>
                    <td className="p-3">{r.RMSE_cm.toFixed(2)}</td>
                    <td className="p-3">{r.rRMSE_percent.toFixed(2)}%</td>
                    <td className="p-3">{r.MAE_cm.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <figure>
          <Image
            src="/images/dbh_observed_vs_predicted.png"
            alt="观测值与预测值对比图"
            width={600}
            height={450}
            className="rounded-md border border-stone-300"
          />
          <p className="figure-caption">图 4 · DBH换算公式观测值与预测值对比（交叉验证）</p>
        </figure>
        <figure>
          <Image
            src="/images/dbh_residual_diagnostics.png"
            alt="残差诊断图"
            width={600}
            height={450}
            className="rounded-md border border-stone-300"
          />
          <p className="figure-caption">图 5 · DBH换算公式残差诊断</p>
        </figure>
      </div>
    </section>
  );
}
