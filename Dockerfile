FROM node:16-alpine as build
    RUN apk add --update python make g++ && rm -rf /var/cache/apk/*
    WORKDIR /app

    COPY package*.json /app/
    RUN npm ci

    COPY . /app/
    RUN npm run compile

FROM node:16-alpine
    RUN apk add --update python make g++ && rm -rf /var/cache/apk/*
    WORKDIR /app
    ENV NODE_ENV=production
    EXPOSE 3000

    ENV TZ 'Europe/Berlin'
    RUN apk add --no-cache tzdata
    RUN cp /usr/share/zoneinfo/${TZ} /etc/localtime

    COPY package*.json /app/
    RUN npm ci

    COPY --from=build /app/assets /app/assets
    COPY --from=build /app/built /app/built

    CMD ["node", "built/app.js"]
