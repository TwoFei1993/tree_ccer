const ESTIMATORS = [
  { id: "E1", name: "Quadratic regression on NDVI + NIRv", info: "Attribute only (spectral)" },
  { id: "E2", name: "IDW interpolation (p = 2)", info: "Space only" },
  { id: "E3", name: "Ordinary kriging (de-mean, interpolate, add back)", info: "Space only" },
  { id: "E4", name: "E1 regression surface + kriged residual correction", info: "Additive fusion" },
  { id: "E5", name: "w·E1 + (1−w)·E2, w a global LOO weight", info: "Weighted fusion" },
  { id: "E6", name: "w·E1 + (1−w)·E3, w a global LOO weight", info: "Weighted fusion" },
  { id: "E7", name: "Per-pixel fusion of E1 and E3 weighted by error maps", info: "Per-pixel weighted fusion" },
];

const PROPOSITIONS = [
  {
    title: "Effective sample size is capped by correlation",
    body: "Spatial correlation caps the effective number of independent samples in full-coverage information at about |D|/(2πℓ²). At Saihanba the direct carbon field (range ≈ 200 m) yields Neff ≈ 0.8 despite 576 pixels, while the regression-residual field (range ≈ 1.7 m) is nearly white noise. This is why adding remote-sensing pixels cannot improve the regional mean, yet a few ground plots buy a disproportionate gain.",
  },
  {
    title: "Fusion never hurts",
    body: "Conditioned on the plots, fusing the regression prior with kriging of its residual reduces posterior variance by the information gain G(S) — a non-negative quantity. Remote sensing plus ground verification is never worse than remote sensing alone.",
  },
  {
    title: "The value of a plot is its conditional covariance",
    body: "Adding a candidate plot j reduces the regional-mean variance by a quantity set by j's conditional covariance with the regional mean. The SMP objective is an operational approximation of this principle in attribute space.",
  },
];

export function MethodologySection() {
  return (
    <section className="space-y-8">
      <h2 className="font-serif text-2xl font-bold text-stone-900">Study area, data, and the SMP-cLHS framework</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-stone-300 bg-white p-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">Data</div>
          <h3 className="font-serif text-lg font-semibold text-stone-900">576 fixed 20 m × 20 m LiDAR plots</h3>
          <p className="mt-2 text-sm text-stone-600">
            Airborne LiDAR yields a canopy height model; individual tree crowns are segmented;
            single-tree carbon is estimated from crown geometry and summed to the pixel containing
            the crown apex (t C/ha = tree carbon in kg ÷ 40). Across the 576 plots in 2024, mean
            carbon density is 58.85 t C/ha (SD 17.74, CV 30.1%). LiDAR DBH was spot-checked against
            101 field-measured trees: relative RMSE 6.5% (2024, 88 matched trees), below the 10%
            threshold of the CCER methodology.
          </p>
        </div>
        <div className="rounded-md border border-stone-300 bg-white p-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">Sampling</div>
          <h3 className="font-serif text-lg font-semibold text-stone-900">SMP-cLHS: sampling in error space</h3>
          <p className="mt-2 text-sm text-stone-600">
            Histogram matching aligns the sample&apos;s NDVI and NIRv distributions to the
            population&apos;s (conditioned Latin hypercube stratification); simulated annealing
            then disperses plots in space under zonal quotas. The sampling attributes are exactly
            the feature space of the downstream model — only satellite-observable indices may
            influence plot selection, never carbon or LiDAR structure.
          </p>
        </div>
      </div>

      <div>
        <h3 className="font-serif text-lg font-semibold text-stone-900">Seven estimators spanning attribute → space → fusion</h3>
        <div className="mt-3 overflow-x-auto rounded-md border border-stone-300 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-left text-stone-600">
              <tr>
                <th className="p-3">No.</th>
                <th className="p-3">Method</th>
                <th className="p-3">Information used</th>
              </tr>
            </thead>
            <tbody>
              {ESTIMATORS.map((e) => (
                <tr key={e.id} className="border-t border-stone-200">
                  <td className="p-3 font-medium">{e.id}</td>
                  <td className="p-3">{e.name}</td>
                  <td className="p-3 text-stone-600">{e.info}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="font-serif text-lg font-semibold text-stone-900">Why this design: three propositions from Gaussian-process conditional inference</h3>
        <div className="mt-3 space-y-3">
          {PROPOSITIONS.map((p, i) => (
            <div key={p.title} className="rounded-md border border-stone-300 bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                Proposition {i + 1}
              </div>
              <h4 className="mt-1 font-serif text-base font-semibold text-stone-900">{p.title}</h4>
              <p className="mt-2 text-sm text-stone-600">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
