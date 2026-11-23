# 식구 프론트 운영 이미지 (Backend/Web/compose.prod.yaml 의 web 서비스가 사용)
# 1단계: Vite 빌드
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2단계: Nginx 로 빌드 결과를 내주고 /api · /images · /ws-stomp 는 백엔드로 넘긴다 (nginx.conf)
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
