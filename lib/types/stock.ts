/** 2024碳储量制图论文(Yau2026 v7)实验数据的类型定义,对应public/data/stock_*.json。 */

/** 全因子实验聚合行(20种子均值±标准差),对应论文Table 2 */
export interface FactorialRow {
  design: string;
  method: string;
  n: number;
  rmseMean: number;
  rmseSd: number;
  maeMean: number;
  r2Mean: number;
}

/** 样本量扫描曲线(100次重复),对应论文Figure 17 */
export interface SweepCurve {
  ns: number[];
  rmseMean: number[];
  rmseSd: number[];
}

export interface SweepCurves {
  nSeeds: number;
  byEstimator: Record<string, SweepCurve>;
  byDesign: Record<string, SweepCurve>;
}

/** 分区RMSE行(n=27),对应论文Table 6 */
export interface ZoneRmseRow {
  design: string;
  method: string;
  zone: string;
  rmse: number;
}

/** 补充实验合集,对应论文§4.7 */
export interface SupplementaryData {
  samplingAttribute: { n: number; ndviOnly: number; bivariate: number }[];
  rfVariant: { design: string; n: number; rmseMean: number; rmseSd: number }[];
  /** CCER现行基线(全域随机+样本均值,制图为全域均值平图)的制图RMSE,20种子聚合 */
  ccerBaseline: { design: string; n: number; rmseMean: number; rmseSd: number }[];
  twoStage: {
    n: number;
    calibrationSize: number;
    singleStageRmse: number;
    singleStageSd: number;
    twoStageRmse: number;
    twoStageSd: number;
    gainPct: number;
  };
}

/** 样点布局:design -> n -> Grid_ID列表(1-based, 576个20m网格) */
export type SampleLayouts = Record<string, Record<string, number[]>>;

/** CCER均值口径对比行,对应论文Table 5 */
export interface CcerCriterionRow {
  n: number;
  ccerCurrent: number;
  e4Smp: number;
  e7Smp: number;
  e4ZoneRandom: number;
  theoreticalU: number;
}
