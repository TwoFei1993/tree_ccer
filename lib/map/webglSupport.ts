/** 检测浏览器是否支持WebGL2,deck.gl渲染的硬性前提条件 */
export function isWebGL2Supported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!canvas.getContext("webgl2");
  } catch {
    return false;
  }
}
