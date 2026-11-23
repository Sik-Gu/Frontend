import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 개발 서버가 /api · /images · /ws-stomp 를 백엔드로 전달한다 (프록시).
// 브라우저 입장에서는 모두 같은 주소(localhost:5173)라 CORS 문제가 생기지 않는다. (운영은 nginx.conf 가 같은 일을 한다)
// 백엔드를 8080 이 아닌 포트로 띄웠다면: PowerShell 에서 $env:BACKEND_URL="http://localhost:8081"; npm run dev
declare const process: { env: Record<string, string | undefined> }; // @types/node 없이 환경변수만 읽는다
const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': BACKEND,
      '/images': BACKEND,
      '/ws-stomp': { target: BACKEND, ws: true },
    },
  },
});
