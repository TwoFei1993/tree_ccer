"use client";

import { useEffect, useMemo, useRef } from "react";
import { Deck } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import { ZoomWidget } from "@deck.gl/widgets";
import "@deck.gl/widgets/stylesheet.css";
import type { Feature, FeatureCollection, Geometry, Polygon } from "geojson";
import type { GridCarbonProperties } from "@/lib/types/geo";
import { gridIdsToPoints, buildSamplePointsLayer } from "@/lib/map/samplePointsLayer";
import { WebGLGuard } from "@/components/map/WebGLGuard";
import { fitBoundsViewState } from "@/lib/map/geoUtils";

interface GridSampleMapProps {
  gridData: FeatureCollection<Polygon, GridCarbonProperties>;
  sampleGridIds: number[];
  /** Grid_ID -> Kriging修正后碳汇增量估计值,来自当前选中场景的corrected_surface/corrected_surface_grid_ids
   * (设计文档§2/§4要求的"Kriging修正曲面"图层数据,不是占位的静态底色) */
  correctedSurfaceByGridId: Map<number, number>;
  /** 用于生成图层id后缀,不同k/校准集规模组合复用同一个Deck实例,不需要以此重建实例 */
  layerIdSuffix: string;
}

/** 修正曲面色阶:低估计值浅黄,高估计值深绿,与carbonToColor(单木图层用)区分开,
 * 避免专家把两个不同分辨率的图层色阶混为一谈 */
function surfaceValueToColor(value: number, minVal: number, maxVal: number): [number, number, number] {
  const range = maxVal - minVal || 1;
  const t = Math.min(1, Math.max(0, (value - minVal) / range));
  const low: [number, number, number] = [245, 236, 180];
  const high: [number, number, number] = [30, 90, 60];
  return [
    Math.round(low[0] + (high[0] - low[0]) * t),
    Math.round(low[1] + (high[1] - low[1]) * t),
    Math.round(low[2] + (high[2] - low[2]) * t),
  ];
}

/** 图例条渲染用:在色阶两端之间取N个采样点生成CSS linear-gradient的色标列表,
 * 与surfaceValueToColor的插值方式完全一致,保证图例条颜色和地图上实际渲染的颜色一一对应。 */
function surfaceColorScaleCss(): string {
  const stops = 8;
  const colors = Array.from({ length: stops }, (_, i) => {
    const [r, g, b] = surfaceValueToColor(i / (stops - 1), 0, 1);
    return `rgb(${r},${g},${b})`;
  });
  return `linear-gradient(to right, ${colors.join(", ")})`;
}

export function GridSampleMap({
  gridData,
  sampleGridIds,
  correctedSurfaceByGridId,
  layerIdSuffix,
}: GridSampleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<Deck | null>(null);

  const [minVal, maxVal] = useMemo(() => {
    const values = Array.from(correctedSurfaceByGridId.values());
    if (values.length === 0) return [0, 1];
    return [Math.min(...values), Math.max(...values)];
  }, [correctedSurfaceByGridId]);

  // 挂载时创建一次Deck实例,依赖数组为[],之后永远复用同一个实例(修复问题2)
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const initialRectForView = container.getBoundingClientRect();
    // 默认视角用fitBoundsViewState动态算出"全景"(撑满整个研究区),而不是硬编码固定zoom——
    // 固定值只对某一个容器宽高比正确,响应式布局下会露出边距或裁掉研究区边缘。
    const initialViewState = fitBoundsViewState(
      initialRectForView.width || 580,
      initialRectForView.height || 453,
    );
    // 用户是否已经手动拖动/缩放过地图——一旦交互过,resize不应再强行把镜头拉回fitBounds,
    // 否则窗口大小发生任何变化(哪怕只是滚动条出现导致的1px抖动)都会把用户刚调好的视角冲掉。
    const hasUserInteractedRef = { current: false };
    // 不自己创建canvas再传给Deck:实测发现"canvas: 自建元素"这个prop在这个版本下并未被
    // Deck真正采用于渲染——DOM里会同时出现我们自建的(空的)canvas和deck.gl内部另外创建
    // 的(真正渲染用的)第二个canvas,我们手动做的resize/物理分辨率同步全部作用在错误的
    // 那个canvas上,导致真实渲染的canvas从未跟上容器尺寸,画面完全错位。改用官方支持的
    // `parent`prop,让Deck自己创建并管理canvas,之后用deck.getCanvas()取得它真正在用的
    // 那个canvas元素来做resize同步,保证引用一致。
    const deck = new Deck({
      parent: container,
      initialViewState,
      // 关掉scrollZoom:deck.gl的MapController默认对鼠标滚轮做preventDefault()+stopPropagation()
      // 来实现"滚轮缩放地图",但代价是用户只是想正常滚动鼠标滚轮浏览整个页面、光标恰好停在这块
      // 地图上方时,也会被当成"缩放手势"拦截,触发下面onViewStateChange里的isZooming=true,
      // 从而永久把hasUserInteractedRef.current设成true——之后任何resize(字体加载完成、
      // 滚动条出现、窗口尺寸变化)都不会再重新fitBounds,镜头永远停在触发那一刻的陈旧状态,
      // 表现出来就是"位置又不对了"。缩放需求已经由ZoomWidget的+/-按钮满足,不需要滚轮缩放。
      controller: { scrollZoom: false },
      layers: [],
      // ZoomWidget加缩放按钮,与TreeCrownMap的NavigationControl视觉/交互一致
      widgets: [new ZoomWidget({ placement: "top-right" })],
      onViewStateChange: ({ interactionState }) => {
        if (interactionState?.isDragging || interactionState?.isPanning || interactionState?.isRotating) {
          hasUserInteractedRef.current = true;
        }
      },
    });
    deckRef.current = deck;

    // canvas的CSS box默认由Deck自身管理为'100%'(defaultProps.width/height),但luma.gl内部
    // 靠自身ResizeObserver同步canvas.width/height这两个物理像素分辨率属性的机制在实测中
    // 并未按预期触发(尤其是容器父级是CSS Grid布局时),导致WebGL drawing buffer停留在
    // 浏览器默认的300x150不变。直接手动设置canvas.width/height物理属性(按devicePixelRatio
    // 换算保证清晰度)并调用deck.redraw(),完全绕开不可靠的内部机制。
    //
    // 光同步分辨率不够:容器在挂载瞬间(骨架屏刚消失、字体/布局还没最终稳定)测到的尺寸,
    // 跟浏览器最终稳定布局后的真实尺寸经常不一样(实测偏差可达上百像素)。initialViewState
    // 的经纬度中心/zoom是按挂载瞬间那个尺寸算出来的一次性快照,后续resize只改了canvas
    // 物理分辨率却没有重新fitBounds,导致镜头依然按旧尺寸的比例取景——真实画面在新尺寸的
    // 容器里就会显得偏移/挤到一角(这正是"双期对比图挤在下方"的根因)。所以每次resize都要
    // 重新算一次fitBounds并显式setProps({initialViewState})覆盖镜头,直到用户开始手动交互
    // 为止(交互之后不再自动纠正,尊重用户已调整好的视角)。
    const syncCanvasResolution = (width: number, height: number) => {
      const canvasEl = deck.getCanvas();
      if (!canvasEl) return;
      const dpr = window.devicePixelRatio || 1;
      canvasEl.width = Math.round(width * dpr);
      canvasEl.height = Math.round(height * dpr);
      if (hasUserInteractedRef.current) {
        deck.setProps({ width, height });
      } else {
        deck.setProps({ width, height, initialViewState: fitBoundsViewState(width, height) });
      }
      deck.redraw();
    };
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      syncCanvasResolution(width, height);
    });
    resizeObserver.observe(container);
    // ResizeObserver的第一次callback是异步的(下一帧才触发),初始挂载时先用当前的
    // getBoundingClientRect同步设置一次,避免第一帧渲染仍停留在默认300x150。
    const initialRect = container.getBoundingClientRect();
    if (initialRect.width > 0 && initialRect.height > 0) {
      syncCanvasResolution(initialRect.width, initialRect.height);
    }

    return () => {
      resizeObserver.disconnect();
      deck.finalize();
      deckRef.current = null;
      // deck.finalize()只在this.canvas===this._ownedCanvas时才移除canvas,但实测在React
      // 开发模式(effect因严格模式被挂载/卸载/重新挂载两次)下deck.gl留下了一个孤儿canvas
      // 未被finalize()清理,导致容器里同时存在一个空的旧canvas和一个新建的真实渲染canvas,
      // 我们的resize同步逻辑作用在错误的canvas上。挂载新实例前强制清空容器兜底。
      container.innerHTML = "";
    };
  }, []);

  // 数据/抽样点变化时,对同一个Deck实例调用setProps更新图层,触发transitions配置的平滑过渡
  useEffect(() => {
    if (!deckRef.current) return;

    const gridLayer = new GeoJsonLayer({
      id: "grid-carbon-base",
      data: gridData,
      filled: true,
      getFillColor: (f: Feature<Geometry, GridCarbonProperties>): [number, number, number, number] => {
        const val = correctedSurfaceByGridId.get(f.properties.Grid_ID);
        if (val === undefined) return [230, 230, 220, 160];
        const [r, g, b] = surfaceValueToColor(val, minVal, maxVal);
        return [r, g, b, 200];
      },
      getLineColor: [140, 140, 120, 200],
      lineWidthMinPixels: 0.5,
      transitions: { getFillColor: 400 }, // 参数切换时修正曲面颜色也平滑过渡,不是硬跳变
    });
    const samplePoints = gridIdsToPoints(gridData, sampleGridIds);
    const pointsLayer = buildSamplePointsLayer(samplePoints, layerIdSuffix);

    deckRef.current.setProps({ layers: [gridLayer, pointsLayer] });
  }, [gridData, sampleGridIds, correctedSurfaceByGridId, minVal, maxVal, layerIdSuffix]);

  return (
    <div>
      <WebGLGuard heightClassName="h-[50vh]">
        <div
          ref={containerRef}
          className="relative h-[50vh] w-full overflow-hidden rounded-md border border-stone-300 bg-stone-50"
          data-testid="grid-sample-map"
        />
      </WebGLGuard>
      <div className="mt-2 flex items-center gap-2 text-xs text-stone-600">
        <span>Kriging修正后碳汇增量估计值（t C/ha）：</span>
        <span>{minVal.toFixed(1)}</span>
        <div
          className="h-3 flex-1 rounded-sm border border-stone-300"
          style={{ background: surfaceColorScaleCss() }}
        />
        <span>{maxVal.toFixed(1)}</span>
      </div>
    </div>
  );
}
