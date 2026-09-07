# 塞罕坝碳汇 MRV 空间误差抽样研究 — 专家评审网站

纯静态 Next.js 网站，用于向评审专家展示研究结论、交互式模型参数面板与真实树冠地图。

## 本地开发

```bash
npm install
npm run dev
```

## 重新生成预计算数据（若原始数据/notebook逻辑有更新）

```bash
bash scripts/setup_data_pipeline.sh   # 首次运行,创建Python虚拟环境
bash scripts/run_data_pipeline.sh     # 重新跑数据管线,同步到 public/data/
```

## 构建静态导出

```bash
npm run build
```

产物在 `out/` 目录，是完全独立的静态文件集合。

## 部署为私有链接（不公开索引）

推荐用 Vercel：

1. 在 Vercel 控制台新建项目，关联本仓库（或用 `vercel` CLI 从本地直接部署 `out/` 目录）。
2. 部署完成后，Vercel 默认生成的 `*.vercel.app` 域名不会被搜索引擎主动收录，可直接作为私有链接分享给评审专家。
3. 如需进一步限制访问，可在 Vercel 项目设置中开启 "Password Protection"（付费计划功能）或改用其他支持访问密码的静态托管平台。
4. 不要在任何公开渠道（如个人博客、公开GitHub仓库的README）中链接该部署地址。
