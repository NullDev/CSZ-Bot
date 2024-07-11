FROM oven/bun:alpine AS runtime-dependencies
    WORKDIR /app
    RUN --mount=type=bind,source=package.json,target=package.json \
        --mount=type=bind,source=bun.lockb,target=bun.lockb \
        --mount=type=cache,target=/root/.bun/install/cache \
        NODE_ENV=production bun install

FROM oven/bun:alpine
    WORKDIR /app
    RUN apk add --no-cache \
        font-noto-emoji \
        fontconfig \
        font-liberation \
        && fc-cache -f -v

    ENV NODE_ENV=production
    ENV TZ=Europe/Berlin

    COPY --from=runtime-dependencies /app/node_modules /app/node_modules
    COPY ./ /app/

    ENTRYPOINT ["bun", "src/app.ts"]
