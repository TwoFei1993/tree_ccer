"use client";

import { useEffect, useRef, useState } from "react";
import { Deck } from "@deck.gl/core";
import { ZoomWidget } from "@deck.gl/widgets";
import "@deck.gl/widgets/stylesheet.css";
import type { FeatureCollection, Geometry } from "geojson";
import type { TreeCrownProperties } from "@/lib/types/geo";
import { buildTreeCrownExtrusionLayer } from "@/lib/map/deckLayers";
import { WebGLGuard } from "@/components/map/WebGLGuard";
import { fitBoundsViewState } from "@/lib/map/geoUtils";

const SHARED_PITCH = 45; // 倾斜2.5D视角,与TreeCrownMap一致

/** pitch=45的倾斜相机下,fitBounds按pitch=0算出的"垂直居中"镜头在倾斜之后会在画面顶/底留出
 * 大小不等的空白(倾斜视角本身不会自动把内容推到某一侧,是相机看向的目标点始终位于屏幕
 * 正中心决定的)。人工反馈明确要求内容贴着面板顶部(紧挨"2018/2024"年份标签下方)而不是
 * 上下留白均匀分布,所以用不对称padding主动把fitBounds算出的目标点往下移——bottom padding
 * 越大,目标点被推得越靠上,画面内容就相应贴近顶部。用height的比例而不是固定像素值,
 * 保证在45vh面板高度变化(不同浏览器窗口高度)时,顶部留白/底部留白的比例保持一致。 */
function panelPadding(height: number) {
  return { top: Math.max(5, height * 0.02), bottom: height * 0.45, left: 20, right: 20 };
}

function PeriodPanel({ year, geoJsonUrl }: { year: number; geoJsonUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<Deck | null>(null);
  const [data, setData] = useState<FeatureCollection<Geometry, TreeCrownProperties> | null>(null);

  useEffect(() => {
    fetch(geoJsonUrl)
      .then((r) => r.json())
      .then(setData)
      .catch((err) => console.error(`[DualPeriodCompare] ${year}年数据加载失败`, err));
  }, [geoJsonUrl, year]);

  // Deck实例只在挂载时创建一次,依赖数组为[]
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const initialRectForView = container.getBoundingClientRect();
    // 默认视角用fitBoundsViewState动态算出"全景"(撑满整个研究区),而不是硬编码固定zoom——
    // 固定值只对某一个容器宽高比正确,响应式布局下会露出边距或裁掉研究区边缘。
    const initialRectHeight = initialRectForView.height || 406;
    const initialViewState = {
      ...fitBoundsViewState(
        initialRectForView.width || 453,
        initialRectHeight,
        undefined,
        panelPadding(initialRectHeight),
      ),
      pitch: SHARED_PITCH,
    };
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
      controller: true,
      layers: [],
      // ZoomWidget加缩放按钮,与TreeCrownMap的NavigationControl视觉/交互一致
      widgets: [new ZoomWidget({ placement: "top-right" })],
      onViewStateChange: ({ interactionState }) => {
        if (
          interactionState?.isDragging ||
          interactionState?.isPanning ||
          interactionState?.isZooming ||
          interactionState?.isRotating
        ) {
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
        deck.setProps({
          width,
          height,
          initialViewState: {
            ...fitBoundsViewState(width, height, undefined, panelPadding(height)),
            pitch: SHARED_PITCH,
          },
        });
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

  // 数据到达后,对同一个Deck实例调用setProps更新图层
  useEffect(() => {
    if (!data || !deckRef.current) return;
    deckRef.current.setProps({ layers: [buildTreeCrownExtrusionLayer(data, `period-${year}`)] });
  }, [data, year]);

  return (
    <div className="flex-1">
      <div className="mb-2 text-center font-serif text-sm text-stone-600">{year}</div>
      <WebGLGuard heightClassName="h-[45vh]">
        <div
          ref={containerRef}
          className="relative h-[45vh] w-full overflow-hidden rounded-md border border-stone-300 bg-stone-50"
        />
      </WebGLGuard>
    </div>
  );
}

export function DualPeriodCompare() {
  return (
    <div className="flex gap-4">
      <PeriodPanel year={2018} geoJsonUrl="/data/tree-crowns/2018/overview.geojson" />
      <PeriodPanel year={2024} geoJsonUrl="/data/tree-crowns/2024/overview.geojson" />
    </div>
  );
}
