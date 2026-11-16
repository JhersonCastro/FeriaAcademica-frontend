FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Only static files: the API is served by the proxy under /api (same origin, so apiBaseUrl stays empty).
FROM nginxinc/nginx-unprivileged:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/sistema-de-gestion-de-eventos-feria-empresarial-front/browser /usr/share/nginx/html
EXPOSE 8080
