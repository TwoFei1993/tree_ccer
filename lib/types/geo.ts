/** 树冠GeoJSON Feature的properties字段,对应 export_tree_crowns.py 的 KEEP_PROPS */
export interface TreeCrownProperties {
  crown_id: number;
  tree_id: string;
  top_h_m: number;
  H_95_Mean: number;
  DBH: number;
  Carbon_kg: number;
  area_m2: number;
}

/** 20m网格GeoJSON Feature的properties字段,对应 export_grid_carbon.py */
export interface GridCarbonProperties {
  Grid_ID: number;
  Row: number;
  Col: number;
  Area_m2: number;
  Carbon_tha_18: number | null;
  Carbon_tha_24: number | null;
  dC: number | null;
  NDVI: number | null;
  NIRv: number | null;
}

/** 对应 export_ground_truth.py 输出的 ground-truth-dbh.json */
export interface GroundTruthData {
  trees: Array<{
    crown_id: number;
    tree_id: string;
    top_h_m: number;
    area_m2: number;
    eq_diam_m: number;
    lat: number;
    lon: number;
    round_cm_: number;
    species: string | null;
    H_Mean: number;
    H_Mean_95: number;
  }>;
  cv_model_results: Array<{
    Model: string;
    Evaluation: string;
    R2: number;
    RMSE_cm: number;
    rRMSE_percent: number;
    MAE_cm: number;
    Bias_cm: number;
  }>;
  /** LiDAR估算DBH vs 地面实测DBH的直接IoU匹配验证(CCER表35要求的验证类型,
   * 与cv_model_results衡量的"DBH换算公式本身"是两套不同的验证,不要混淆引用 */
  lidar_vs_field_validation: Array<{
    year: string;
    n: number;
    rmse: number;
    bias: number;
    rrmse: number;
    r2: number;
    mean_field_cm: number;
    mean_lidar_cm: number;
  }>;
}
