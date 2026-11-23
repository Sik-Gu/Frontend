import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 백엔드(Spring, 8080)에 CORS 설정이 없어서 개발 서버가 대신 전달한다 (프록시).
// 브라우저 입장에서는 모두 같은 주소(localhost:5173)라 CORS 문제가 생기지 않는다.
const BACKEND = 'http://localhost:8080';

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
