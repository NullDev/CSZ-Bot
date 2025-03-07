# syntax=docker/dockerfile:1
# check=error=true

FROM oven/bun:1-alpine AS runtime-dependencies
    WORKDIR /app
    RUN --mount=type=bind,source=package.json,target=package.json \
        --mount=type=bind,source=bun.lock,target=bun.lock \
        --mount=type=cache,target=/root/.bun/install/cache \
        NODE_ENV=production bun install

FROM oven/bun:1-alpine
    WORKDIR /app
    # ffmpeg needed for get-audio-duration
    RUN apk add --no-cache \
        font-noto-emoji \
        fontconfig \
        ffmpeg \
        font-liberation \
        && fc-cache -f -v

    ENV NODE_ENV=production
    ENV TZ=Europe/Berlin

    COPY --from=runtime-dependencies /app/node_modules /app/node_modules
    COPY ./ /app/

    ARG RELEASE_IDENTIFIER
    ARG BUILD_NUMBER
    RUN echo "RELEASE_IDENTIFIER=${RELEASE_IDENTIFIER:-debug}" >> /app/.env && \
        echo "BUILD_NUMBER=${BUILD_NUMBER:-0}" >> /app/.env

    ENTRYPOINT ["bun", "src/app.ts"]
