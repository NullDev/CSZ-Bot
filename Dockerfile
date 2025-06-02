# syntax=docker/dockerfile:1
# check=error=true

FROM node:alpine AS runtime-dependencies
    WORKDIR /app

    # TODO: Use --mount=type=bind or secret for this?
    RUN echo "@jsr:registry=https://npm.jsr.io" >> .npmrc

    RUN --mount=type=bind,source=package.json,target=package.json \
        --mount=type=bind,source=package-lock.json,target=package-lock.json \
        --mount=type=cache,target=/root/.npm \
        NODE_ENV=production npm ci

FROM node:alpine
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

    ENTRYPOINT ["./node_modules/.bin/tsx", "--env-file", "/app/.env", "src/app.ts"]
