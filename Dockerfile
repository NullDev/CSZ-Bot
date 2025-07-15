# syntax=docker/dockerfile:1
# check=error=true

FROM node:alpine AS runtime-dependencies

    WORKDIR /app
    RUN apk add --no-cache python3 alpine-sdk

    # TODO: Use --mount=type=bind or secret for this?
    RUN echo "@jsr:registry=https://npm.jsr.io" >> .npmrc

    RUN --mount=type=bind,source=package.json,target=package.json \
        --mount=type=bind,source=package-lock.json,target=package-lock.json \
        --mount=type=cache,target=/root/.npm \
        NODE_ENV=production \
        YOUTUBE_DL_SKIP_DOWNLOAD=true \
        npm ci

FROM node:alpine
    WORKDIR /app
    # ffmpeg needed for get-audio-duration
    RUN apk add --no-cache \
        font-noto-emoji \
        fontconfig \
        ffmpeg \
        font-liberation \
        python3 \
        py-pip \
        && fc-cache -f -v \
        && pip install yt-dlp --break-system-packages

    ENV NODE_ENV=production
    ENV TZ=Europe/Berlin

    COPY --from=runtime-dependencies /app/node_modules /app/node_modules
    COPY ./ /app/

    ARG RELEASE_IDENTIFIER
    ARG BUILD_NUMBER
    RUN echo "RELEASE_IDENTIFIER=${RELEASE_IDENTIFIER:-debug}" >> /app/.env && \
        echo "BUILD_NUMBER=${BUILD_NUMBER:-0}" >> /app/.env

    ENTRYPOINT ["./node_modules/.bin/tsx", "--env-file", "/app/.env", "src/app.ts"]
