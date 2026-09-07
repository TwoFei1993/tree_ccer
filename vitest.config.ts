import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // deck.gl widgets的CSS只影响视觉样式,测试只关心DOM/逻辑。别名到一个空.js模块(而非.css)
      // 是关键——项目的postcss.config.mjs用字符串形式声明插件名("@tailwindcss/postcss"),
      // Next.js自己的构建链路能解析这种写法,但vitest独立启动的vite实例走的是通用postcss
      // loader,不会把字符串解析成插件实例,只要vite的CSS管线处理任意.css文件就会报错
      // "Invalid PostCSS Plugin"。用.js别名彻底跳过CSS管线,而不是试图让它正确处理一个空文件。
      "@deck.gl/widgets/stylesheet.css": path.resolve(__dirname, "./vitest.empty-css-stub.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
