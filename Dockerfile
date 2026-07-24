# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Stage 1: build the Vite React app with Node
# -----------------------------------------------------------------------------
FROM node:24-alpine AS build

WORKDIR /app

# Install dependencies first for better layer caching when only source changes
COPY package.json package-lock.json ./
RUN npm ci

# Application source (see .dockerignore)
COPY . .

# Vite embeds these at build time (must be VITE_* prefixed)
ARG VITE_API_BASE_URL=http://localhost:8000
ARG VITE_USE_LOCAL_DEV_PIPELINE=true
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_USE_LOCAL_DEV_PIPELINE=$VITE_USE_LOCAL_DEV_PIPELINE

RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: serve static assets with nginx (small final image)
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS production

# Replace default site config with SPA-friendly nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Only the production build artifacts are copied into the runtime image
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
