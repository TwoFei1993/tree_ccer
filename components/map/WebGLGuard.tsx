"use client";

import { useEffect, useState, type ReactNode } from "react";
import { isWebGL2Supported } from "@/lib/map/webglSupport";

interface WebGLGuardProps {
  children: ReactNode;
  /** 兜底提示区域的高度class,与被包裹的地图容器保持一致的视觉占位,避免布局跳动 */
  heightClassName?: string;
}

/** 统一的WebGL2支持检测包裹层。三处独立的deck.gl渲染点(TreeCrownMap、
 * GridSampleMap、DualPeriodCompare的PeriodPanel)都应该用这个组件包裹,
 * 而不是各自重复实现检测逻辑。不支持时渲染文字兜底提示,不渗透到子组件内部渲染逻辑。 */
export function WebGLGuard({ children, heightClassName = "h-[70vh]" }: WebGLGuardProps) {
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => {
    setWebglOk(isWebGL2Supported());
  }, []);

  if (!webglOk) {
    return (
      <div
        className={`flex ${heightClassName} w-full items-center justify-center rounded-md border border-amber-400 bg-amber-50 p-8 text-center`}
      >
        <p className="text-sm text-amber-800">
          当前浏览器不支持 WebGL2，无法渲染交互式地图。请使用最新版 Chrome、Edge 或 Firefox 浏览器打开本页面。
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
