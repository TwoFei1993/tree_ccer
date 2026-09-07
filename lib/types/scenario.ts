/** 对应 data-pipeline/output/scenarios_k_calsize.json 中每条记录 */
export interface KCalSizeScenario {
  k: number;
  cal_size: number;
  sigma2: number;
  ell_m: number;
  rmse_m4: number;
  rmse_m1: number;
  improvement_pct: number;
  sample_grid_ids: number[];
  /** 全域576个网格点的Kriging修正后碳汇增量估计值,与corrected_surface_grid_ids一一对应 */
  corrected_surface: number[];
  corrected_surface_grid_ids: number[];
}

/** 对应 data-pipeline/output/scenarios_prior_models.json 中每条记录 */
export interface PriorModelScenario {
  config_name: string;
  per_k: Record<
    string,
    {
      improvement_mean_pct: number;
      improvement_min_pct: number;
    }
  >;
}
