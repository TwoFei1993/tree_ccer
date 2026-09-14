interface Finding {
  label: string;
  value: string;
  detail: string;
}

// 数字来源:论文Table 2(n=27回归族RMSE 17.29→12.58/12.55,即27.3%/27.4%改善)、
// Table 5(均值口径n=18时E7+SMP 3.09% vs CCER现有5.47%)、§4.2(三优化样点≈六随机样点)、
// §2.2(LiDAR DBH vs 地面实测 2024年rRMSE=6.5%,88棵,IoU>0.5匹配)
const FINDINGS: Finding[] = [
  {
    label: "RMSE reduction from optimized sampling",
    value: "27.4%",
    detail: "Regression-family mapping RMSE at n = 27: 17.29 → 12.55 t C/ha vs within-zone random (20 seeds)",
  },
  {
    label: "Verification efficiency",
    value: "≈ 2×",
    detail: "Three optimized plots per zone match the mapping accuracy of six randomly placed ones",
  },
  {
    label: "LiDAR validated against field",
    value: "6.5%",
    detail: "Relative RMSE of LiDAR DBH vs 88 field-measured trees (2024, IoU > 0.5 matching), below the 10% CCER threshold",
  },
];

export function KeyFindingsCard() {
  return (
    <div className="grid gap-4 rounded-md border border-stone-300 bg-white p-6 shadow-sm md:grid-cols-3">
      {FINDINGS.map((f) => (
        <div key={f.label} className="text-center">
          <div className="text-xs uppercase tracking-wide text-stone-500">{f.label}</div>
          <div className="mt-2 font-serif text-2xl font-semibold text-emerald-900">{f.value}</div>
          <div className="mt-1 text-xs text-stone-500">{f.detail}</div>
        </div>
      ))}
    </div>
  );
}
