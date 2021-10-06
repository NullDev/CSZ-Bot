FROM node:16-alpine as build
    WORKDIR /app

    RUN apk add --no-cache python3 build-base g++ libpng libpng-dev jpeg-dev pango-dev cairo-dev make g++ && rm -rf /var/cache/apk/*

    # Install dependencies (with dev-deps)
    COPY package*.json /app/
    RUN npm ci

    COPY . /app/
    RUN npm run compile

    # Install dependencies (runtime-deps only)
    RUN NODE_ENV=production npm ci

FROM node:16-alpine
    WORKDIR /app

    ENV NODE_ENV=production
    EXPOSE 3000

    ENV TZ 'Europe/Berlin'
    RUN apk add --no-cache tzdata
    RUN cp /usr/share/zoneinfo/${TZ} /etc/localtime

    COPY --from=build /app/node_modules /app/node_modules
    COPY --from=build /app/assets /app/assets
    COPY --from=build /app/built /app/built

    CMD ["node", "built/app.js"]
