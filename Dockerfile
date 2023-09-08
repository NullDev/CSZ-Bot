FROM oven/bun:latest as dependency-base
    WORKDIR /app
    RUN apt-get update -yqq \
        && apt-get install -yqq \
            python3 build-essential pkg-config \
            # https://github.com/Automattic/node-canvas/issues/1065#issuecomment-654706161
            libpixman-1-dev libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
        && apt-get clean -yqqq

    COPY package*.json /app/

FROM dependency-base as build
    # Install dependencies with dev-deps
    RUN bun install

FROM dependency-base as runtime-dependencies
    RUN NODE_ENV=production bun install

FROM oven/bun:latest
    WORKDIR /app
    RUN apt-get update -yqqq \
        && apt-get install -yqqq \
            ffmpeg \
            fonts-noto-color-emoji \
            fontconfig \
            fonts-liberation \
            libpixman-1-dev libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
        && apt-get clean -yqqq \
        && fc-cache -f -v

    ENV NODE_ENV=production
    EXPOSE 3000

    ENV TZ 'Europe/Berlin'
    RUN cp /usr/share/zoneinfo/${TZ} /etc/localtime

    COPY --from=runtime-dependencies /app/node_modules /app/node_modules
    COPY ./ /app/

    ENTRYPOINT ["bun", "src/app.ts"]
