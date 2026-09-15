"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Deck, OrbitView } from "@deck.gl/core";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";

/** 复刻论文图13配色:YlGn(真值/估计)、Reds(误差),与matplotlib同名的9档锚点 */
const YLGN = ["#ffffe5", "#f7fcb9", "#d9f0a3", "#addd8e", "#78c679", "#41ab5d", "#238443", "#006837", "#004529"];
const REDS = ["#fff5f0", "#fee0d2", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#a50f15", "#67000d"];

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

function makeColormap(stops: string[]) {
  const rgb = stops.map(hexToRgb);
  return (t: number): [number, number, number] => {
    const x = Math.min(1, Math.max(0, t)) * (rgb.length - 1);
    const i = Math.min(rgb.length - 2, Math.floor(x));
    const f = x - i;
    return [
      rgb[i][0] + (rgb[i + 1][0] - rgb[i][0]) * f,
      rgb[i][1] + (rgb[i + 1][1] - rgb[i][1]) * f,
      rgb[i][2] + (rgb[i + 1][2] - rgb[i][2]) * f,
    ];
  };
}

interface SurfaceData {
  rows: number;
  cols: number;
  cellSizeM: number;
  sampleCount: number;
  unsampledRmse: number;
  truth: number[][];
  estimate: number[][];
  error: number[][];
}

/** 由24×24值网格构建SimpleMeshLayer的mesh:格心为顶点,z按夸张系数抬升,顶点色由色阶映射。
 * 注意SimpleMeshLayer要求attribute对象格式({value,size}),不是裸TypedArray。 */
function buildMesh(grid: number[][], cellSize: number, zExag: number, vmin: number, vmax: number, colormap: (t: number) => [number, number, number]) {
  const rows = grid.length;
  const cols = grid[0].length;
  const count = rows * cols;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      positions[i * 3] = (c + 0.5) * cellSize;
      positions[i * 3 + 1] = (r + 0.5) * cellSize;
      positions[i * 3 + 2] = Math.max(0, grid[r][c]) * zExag;
      const [cr, cg, cb] = colormap((grid[r][c] - vmin) / (vmax - vmin || 1));
      colors[i * 3] = cr;
      colors[i * 3 + 1] = cg;
      colors[i * 3 + 2] = cb;
    }
  }
  const quads = (rows - 1) * (cols - 1);
  // 非索引三角形 soup:实测此deck.gl 9.4+luma组合下Geometry的索引路径会丢三角形
  // (隔离测试:2x2网格仅第一个三角形绘制,非索引写法则全部绘制),故每顶点独立展开。
  const indices = new Uint16Array(quads * 6);
  let k = 0;
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      const b = a + 1;
      const d = a + cols;
      const e = d + 1;
      indices[k++] = a; indices[k++] = b; indices[k++] = d;
      indices[k++] = b; indices[k++] = e; indices[k++] = d;
    }
  }
  // 展开为非索引格式(每三角形3顶点),正反两面都保留,任何视角都完整
  const soupPositions = new Float32Array(indices.length * 3);
  const soupColors = new Float32Array(indices.length * 3);
  indices.forEach((vi, i) => {
    soupPositions[i * 3] = positions[vi * 3];
    soupPositions[i * 3 + 1] = positions[vi * 3 + 1];
    soupPositions[i * 3 + 2] = positions[vi * 3 + 2];
    soupColors[i * 3] = colors[vi * 3];
    soupColors[i * 3 + 1] = colors[vi * 3 + 1];
    soupColors[i * 3 + 2] = colors[vi * 3 + 2];
  });
  return {
    positions: { value: soupPositions, size: 3 },
    colors: { value: soupColors, size: 3 },
  };
  return {
    positions: { value: positions, size: 3 },
    colors: { value: colors, size: 3 },
    // flatShading模式着色器会用面法线,法线属性只需占位满足geometry归一化
    normals: { value: new Float32Array(count * 3), size: 3 },
    indices,
  };
}

function SurfacePanel({
  mesh,
  title,
  subtitle,
  vmin,
  vmax,
  colormap,
  colorbarLabel,
}: {
  mesh: {
    positions: { value: Float32Array; size: number };
    colors: { value: Float32Array; size: number };
  } | null;
  title: string;
  subtitle: string;
  vmin: number;
  vmax: number;
  colormap: (t: number) => [number, number, number];
  colorbarLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Deck的泛型随views参数变化,用InstanceType避免在ref类型上锁死具体View泛型
  const deckRef = useRef<InstanceType<typeof Deck> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const deck = new Deck({
      // parent必须显式指定:不带parent/canvas时Deck会把canvas append到document.body,
      // 画面渲染在面板外(实测三个曲面画到了body下的绝对定位canvas里,面板本身全空)。
      parent: container,
      // OrbitView实例不能三个Deck共享(View内部有per-deck状态),每个面板各建一个。
      // orthographic正交投影:透视模式下近处尖峰会在画面上放大到遮住后方大片区域,
      // 曲面呈现"碎片化";论文的matplotlib 3D图接近正交效果,正交下整片地形一目了然。
      views: new OrbitView({ id: "orbit", orthographic: true, controller: { scrollZoom: false } }),
      initialViewState: { target: [240, 240, 55], rotationX: 90, rotationOrbit: 0, zoom: -0.8 },
      controller: { scrollZoom: false },
      width: rect.width || 320,
      height: rect.height || 260,
      layers: [],
      getCursor: () => "grab",
    });
    deckRef.current = deck;

    const syncSize = (width: number, height: number) => {
      if (width <= 0 || height <= 0) return;
      deck.setProps({ width, height });
    };
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      syncSize(entry.contentRect.width, entry.contentRect.height);
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      deck.finalize();
      deckRef.current = null;
      container.innerHTML = "";
    };
  }, []);

  // mesh数据就绪/变化时更新图层(Deck实例复用)
  useEffect(() => {
    if (!deckRef.current || !mesh) return;
    type MeshLayerProps = ConstructorParameters<typeof SimpleMeshLayer>[0];
    // 与论文plot_surface一致:纯色填充,不加线框。cullMode:'none'关闭背面剔除,
    // 保证倾斜视角下陡坡面不被剔除、曲面完整;面板底色用matplotlib风格的浅灰,
    // 让色阶浅端(YlGn近白的低碳谷地)也能在灰底上显形。
    deckRef.current.setProps({
      layers: [
        new SimpleMeshLayer({
          id: `surface-fill-${title}`,
          // deck.gl对"mesh对象直接作为data"的TS联合类型定义与运行时用法不匹配,
          // 运行时官方示例即传同一对象,这里整体断言到层的props类型
          data: mesh,
          mesh,
          // 最终颜色 = 顶点色 × getColor(默认纯黑!)。给白色让顶点色原样透出
          getColor: [255, 255, 255],
          flatShading: true,
          parameters: { cullMode: "none" },
          material: { ambient: 0.82, diffuse: 0.55 },
          pickable: false,
        } as unknown as MeshLayerProps),
      ],
    });
  }, [mesh, title]);

  const gradient = useMemo(() => {
    const stops = Array.from({ length: 9 }, (_, i) => colormap(i / 8));
    return `linear-gradient(to right, ${stops.map((c) => `rgb(${c.map((v) => Math.round(v * 255)).join(",")})`).join(", ")})`;
  }, [colormap]);

  return (
    <div>
      <div className="mb-1 text-center font-serif text-sm font-semibold text-stone-800">{title}</div>
      <div
        ref={containerRef}
        className="h-[260px] w-full overflow-hidden rounded-md border border-stone-300 bg-[#e9e9e7]"
        data-testid={`surface-${title}`}
      />
      <div className="mt-1 flex items-center justify-center gap-2 text-[11px] text-stone-500">
        <span>{vmin}</span>
        <div className="h-2 w-24 rounded-sm border border-stone-300" style={{ background: gradient }} />
        <span>{vmax}</span>
        <span>{colorbarLabel}</span>
      </div>
      <div className="mt-0.5 text-center text-[11px] text-stone-500">{subtitle}</div>
    </div>
  );
}

/** 论文图13的可交互版本:真值/E4估计/误差三个三维曲面,可拖动旋转、按钮缩放。 */
export function Surface3DPanelGrid() {
  const [data, setData] = useState<SurfaceData | null>(null);

  useEffect(() => {
    fetch("/data/stock_surfaces.json")
      .then((r) => r.json())
      .then(setData)
      .catch((err) => console.error("[Surface3D] data failed", err));
  }, []);

  const meshes = useMemo(() => {
    if (!data) return null;
    const cell = data.cellSizeM;
    const zExag = 1.4;
    const ylgn = makeColormap(YLGN);
    const reds = makeColormap(REDS);
    return {
      truth: buildMesh(data.truth, cell, zExag, 0, 110, ylgn),
      estimate: buildMesh(data.estimate, cell, zExag, 0, 110, ylgn),
      error: buildMesh(data.error, cell, zExag, 0, 35, reds),
    };
  }, [data]);

  if (!data || !meshes) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-md border border-stone-300 bg-stone-50 text-sm text-stone-400">
        Loading 3D surfaces…
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        <SurfacePanel
          mesh={meshes.truth}
          title="① LiDAR truth surface"
          subtitle="576-pixel carbon stock, 2024"
          vmin={0}
          vmax={110}
          colormap={makeColormap(YLGN)}
          colorbarLabel="t C/ha"
        />
        <SurfacePanel
          mesh={meshes.estimate}
          title="② E4 estimated surface"
          subtitle={`n=${data.sampleCount}, SMP; unsampled-pixel RMSE ${data.unsampledRmse.toFixed(2)} t C/ha`}
          vmin={0}
          vmax={110}
          colormap={makeColormap(YLGN)}
          colorbarLabel="t C/ha"
        />
        <SurfacePanel
          mesh={meshes.error}
          title="③ Error surface"
          subtitle="|estimate − truth|, unsampled pixels"
          vmin={0}
          vmax={35}
          colormap={makeColormap(REDS)}
          colorbarLabel="t C/ha"
        />
      </div>
      <p className="mt-1 text-center text-[11px] text-stone-400">
        Drag to rotate · buttons/scroll wheel disabled over the panel to keep page scrolling
      </p>
    </div>
  );
}
