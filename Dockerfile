FROM node:21-slim as dependency-base
    WORKDIR /app
    RUN apt-get update -yqq \
        && apt-get install -yqq \
            python3 build-essential pkg-config \
        && apt-get clean -yqqq

FROM dependency-base as build
    # Install dependencies (with dev-deps)
    RUN --mount=type=bind,source=package.json,target=package.json \
        --mount=type=bind,source=package-lock.json,target=package-lock.json \
        --mount=type=cache,target=/root/.npm \
        npm ci

    COPY . /app/
    RUN npm run compile

FROM dependency-base as runtime-dependencies
    RUN --mount=type=bind,source=package.json,target=package.json \
        --mount=type=bind,source=package-lock.json,target=package-lock.json \
        --mount=type=cache,target=/root/.npm \
        NODE_ENV=production npm ci

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
    COPY --from=build /app/package.json /app/package.json
    COPY --from=build /app/assets /app/assets
    COPY --from=build /app/built /app/built

    ENTRYPOINT ["node", "--es-module-specifier-resolution=node", "built/app.js"]
