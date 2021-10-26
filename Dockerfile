FROM node:16-slim as build
    WORKDIR /app

    # Install dependencies (with dev-deps)
    COPY package*.json /app/
    RUN npm ci

    COPY . /app/
    RUN npm run compile

FROM node:16-slim as runtime-dependencies
    WORKDIR /app

    # Install dependencies (runtime-deps only)
    COPY package*.json /app/
    RUN NODE_ENV=production npm ci

FROM node:16-slim
    WORKDIR /app
    RUN apt update -yqq && \
        apt install fonts-noto-color-emoji -yqq && \
        apt clean

    ENV NODE_ENV=production
    EXPOSE 3000

    ENV TZ 'Europe/Berlin'
    RUN cp /usr/share/zoneinfo/${TZ} /etc/localtime

    COPY --from=runtime-dependencies /app/node_modules /app/node_modules
    COPY --from=build /app/package.json /app/package.json
    COPY --from=build /app/assets /app/assets
    COPY --from=build /app/built /app/built

    CMD ["node", "built/app.js"]
