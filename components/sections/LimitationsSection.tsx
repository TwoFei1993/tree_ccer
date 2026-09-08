const LIMITATIONS = [
  {
    title: "树种数据缺失",
    body: "101棵地面实测单木中仅8棵标注了树种，绝大多数样本缺少树种信息，无法按树种细分验证模型适用性。",
  },
  {
    title: "碳汇增量估计的信噪比显著低于碳储量存量",
    body: "变异系数360%（碳储量仅30%），遥感先验解释力R²仅0.03（碳储量为0.63）。这是本研究方法学定位中最关键的诚实性发现，不是模型选择问题，而是估计对象本身的本质困难。",
  },
  {
    title: "地面验证范围有限",
    body: "目前的地面实测验证（6.5%–8.1%误差）仅覆盖单木胸径（DBH）这一环节，尚未扩展到样地尺度的碳储量/碳汇增量层面的独立地面验证。",
  },
  {
    title: "个别树冠存在LiDAR分割误差",
    body: "2024年树冠数据中有1棵树标注高度43.06米，远超本地树种正常高度上限（约27-30米），其冠幅、胸径同样显著偏高，符合LiDAR算法将相邻多棵树误合并识别为一棵的典型特征。已核对原始shapefile，确认该异常值在源数据层面就存在，不是本站计算或展示逻辑引入的错误。为避免这一个点在3D可视化中过度支配画面比例，展示层对挤出高度做了视觉封顶（不影响碳储量、碳汇增量等数值计算），但尚未对这类分割误差做系统性的自动检测与剔除。",
  },
];

export function LimitationsSection() {
  return (
    <section className="space-y-4">
      <h2 className="font-serif text-2xl font-bold text-stone-900">局限性与待验证事项</h2>
      <div className="space-y-4">
        {LIMITATIONS.map((l) => (
          <div key={l.title} className="rounded-md border-l-4 border-amber-600 bg-amber-50 p-4">
            <h3 className="font-serif font-semibold text-stone-900">{l.title}</h3>
            <p className="mt-1 text-sm text-stone-700">{l.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
