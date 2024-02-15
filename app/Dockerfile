# Stage 1: Build environment
FROM node:18-bullseye-slim AS build

RUN mkdir /build
WORKDIR /build

COPY package*.json ./

RUN npm ci && npm cache clean --force

COPY . .

RUN npm run build:next
RUN npm run build:temporal

# Stage 2: Production environment
FROM node:18-bullseye-slim AS production

RUN apt-get update \
    && apt-get install -y ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir /app
WORKDIR /app

COPY --from=build /build/dist/standalone /app/nextjs
COPY --from=build /build/dist/static /app/nextjs/dist/static
COPY --from=build /build/temporal/lib /app/worker
COPY --from=build /build/package*.json /app

# Install only production dependencies
RUN npm install --omit=dev && npm cache clean --force


ARG BUILD_VERSION="not_set"
ENV BUILD_VERSION=$BUILD_VERSION
ENV NODE_ENV=production

USER node
CMD ["node", "/app/nextjs/server.js"]