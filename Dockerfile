FROM oven/bun:latest as dependency-base
    WORKDIR /app
    RUN apt-get update -yqq \
        && apt-get install -yqq \
            python3 build-essential pkg-config \
        && apt-get clean -yqqq

FROM dependency-base as runtime-dependencies
    RUN --mount=type=bind,source=package.json,target=package.json \
        --mount=type=bind,source=bun.lockb,target=bun.lockb \
        NODE_ENV=production bun install

FROM node:21-slim
    WORKDIR /app
    RUN apt-get update -yqqq \
        && apt-get install -yqqq \
            ffmpeg \
            fonts-noto-color-emoji \
            fontconfig \
            fonts-liberation \
        && apt-get clean -yqqq \
        && fc-cache -f -v

    ENV NODE_ENV=production
    EXPOSE 3000

    ENV TZ 'Europe/Berlin'
    RUN cp /usr/share/zoneinfo/${TZ} /etc/localtime

    COPY --from=runtime-dependencies /app/node_modules /app/node_modules
    COPY ./ /app/

    ENTRYPOINT ["bun", "src/app.ts"]
