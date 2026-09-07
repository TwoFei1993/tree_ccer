interface Finding {
  label: string;
  value: string;
  detail: string;
}

// 数字来源:交付成果/results/碳汇增量_蒙特卡洛结果.csv(RMSE改善) +
// notebook cell 49 k选择规则(推荐区间) +
// 交付成果/code/ground_truth_validation.py 的LiDAR估算DBH vs 地面实测DBH直接比对结果
// (2018年rRMSE=8.07%、2024年rRMSE=6.53%,由Task 9导出到ground-truth-dbh.json的
// lidar_vs_field_validation字段——注意不是DBH换算公式本身的cv_model_results那组数字,
// 后者rRMSE范围是6.5%-7.0%,是另一套验证,详见Task 24的区分说明)
const FINDINGS: Finding[] = [
  { label: "相对CCER基线RMSE改善", value: "32%–57%", detail: "跨5个独立随机种子验证稳健" },
  { label: "推荐监测样本量区间", value: "k = 100–180", detail: "基于边际改善率拐点分析" },
  { label: "地面实测DBH验证误差", value: "6.5%–8.1%", detail: "LiDAR估算DBH与地面实测DBH直接比对（2018/2024两期IoU匹配），满足CCER表35的10%阈值" },
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
