FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV SQLITE_DIR=/data

# 컨테이너 재배포 시에도 데이터를 유지하려면 /data 를 Persistent Disk/Volume 으로 마운트하세요.
VOLUME ["/data"]

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
