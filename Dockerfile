FROM node:18-slim as dependency-base
    WORKDIR /app
    RUN apt-get update -yqq && \
        apt-get install python3 build-essential pkg-config -yqq && \
        apt-get clean

    COPY package*.json /app/

FROM dependency-base as build
    # Install dependencies (with dev-deps)
    RUN npm ci

    COPY . /app/
    RUN npm run compile

FROM dependency-base as runtime-dependencies
    RUN NODE_ENV=production npm ci

FROM node:18-slim
    WORKDIR /app
    RUN apt-get update -yqq && \
        apt-get install ffmpeg fonts-noto-color-emoji fontconfig fonts-liberation -yqq && \
        apt-get clean && \
        fc-cache -f -v

    ENV NODE_ENV=production
    EXPOSE 3000

    ENV TZ 'Europe/Berlin'
    RUN cp /usr/share/zoneinfo/${TZ} /etc/localtime

    COPY --from=runtime-dependencies /app/node_modules /app/node_modules
    COPY --from=build /app/package.json /app/package.json
    COPY --from=build /app/assets /app/assets
    COPY --from=build /app/built /app/built

    CMD ["node", "built/app.js"]
