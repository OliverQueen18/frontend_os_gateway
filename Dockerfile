# Build stage
FROM node:22-alpine AS build
WORKDIR /app

ARG BUILD_CONFIGURATION=production

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration=${BUILD_CONFIGURATION}

# Runtime stage (image pour CI ; en prod le HTML est extrait vers Nginx hôte)
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend_os_gateway/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
