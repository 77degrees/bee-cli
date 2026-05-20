FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

COPY . .

ENV BEE_FORCE_FILE_STORE=1
ENV BEE_CONFIG_DIR=/data/.bee
ENV HOME=/data
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

EXPOSE 3773

VOLUME /data/.bee

CMD ["bun", "run", "./sources/main.ts", "ui", "--port", "3773"]
