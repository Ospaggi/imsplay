import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import fs from "fs";
import path from "path";

/**
 * BNK/ISS 파일 요청을 조용히 처리하는 Vite 플러그인
 * 파일 존재 여부 확인 시 React Router의 "No route matches URL" 오류를 방지
 */
function silentStaticFilePlugin(): Plugin {
  return {
    name: "silent-static-file",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || "";
        // BNK, ISS 파일 요청인 경우 (URL 디코딩 후 확인)
        const decodedUrl = decodeURIComponent(url);
        if (/\.(BNK|ISS)$/i.test(decodedUrl)) {
          const filePath = path.join(process.cwd(), "public", decodedUrl);
          // 파일이 없으면 조용히 404 반환 (로그 출력 안 함)
          if (!fs.existsSync(filePath)) {
            res.statusCode = 404;
            res.end();
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [silentStaticFilePlugin(), tailwindcss(), reactRouter(), tsconfigPaths()],
  optimizeDeps: {
    exclude: ['iconv'], // 서버 전용 네이티브 모듈 제외
  },
});
