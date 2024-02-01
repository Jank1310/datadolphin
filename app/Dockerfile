# see https://docs.temporal.io/dev-guide/typescript/foundations#using-nodeslim-images
FROM node:18-bullseye-slim

RUN apt-get update \
    && apt-get install -y ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir /build
RUN mkdir /app
WORKDIR /build

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build:next
RUN npm run build:temporal

# build folder is from nextjs
RUN cp -r ./build/standalone /app/nextjs
RUN cp -r ./temporal/lib /app/worker

WORKDIR /app


ARG BUILD_VERSION="not_set"
ENV BUILD_VERSION=$BUILD_VERSION
ENV NODE_ENV=production

USER node
CMD ["node", "/app/nextjs/server.js"]
