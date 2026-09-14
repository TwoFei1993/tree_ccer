const LIMITATIONS = [
  {
    title: "The evaluation truth is LiDAR-inverted, not field-measured",
    body: "LiDAR single-tree DBH was validated against 101 measured trees (relative RMSE 6.5%), but the absolute accuracy of per-pixel stock still depends on the allometric equations, only 39.6% of the measured trees fall inside the study area, and the check stops at DBH as an intermediate variable.",
  },
  {
    title: "One study area, one date, one scale (~460 m square)",
    body: "The NDVI distribution is strongly left-skewed (mean 0.82), and no perturbation analysis was run on the sensitivity of histogram matching to the low-NDVI tail. Scaling up requires recalibrating the variogram.",
  },
  {
    title: "LOO weights ignore error correlation",
    body: "The leave-one-out weights of E5/E6 use inverse error variances and ignore the correlation between the two fused errors, which is in theory information the fusion could exploit.",
  },
  {
    title: "Simulated annealing is a stochastic search",
    body: "Results across designs have converged over 20 seeds (small standard deviations), but a better layout search may still exist within the same objective.",
  },
  {
    title: "No independent prior-period observations",
    body: "The design uses no independent prior-period observations. Should historical survey data independent of the 2024 inversion become available, the sampling attributes could be extended and the framework re-run end to end.",
  },
];

export function LimitationsSection() {
  return (
    <section className="space-y-6">
      <h2 className="font-serif text-2xl font-bold text-stone-900">Limitations</h2>
      <div className="space-y-3">
        {LIMITATIONS.map((l, i) => (
          <div key={l.title} className="rounded-md border border-stone-300 bg-white p-5">
            <h3 className="font-serif text-base font-semibold text-stone-900">
              ({i + 1}) {l.title}
            </h3>
            <p className="mt-2 text-sm text-stone-600">{l.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
