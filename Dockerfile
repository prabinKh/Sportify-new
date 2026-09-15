ARG VITE_SPOTIFY_CLIENT_ID
ARG VITE_SPOTIFY_REDIRECT_URL=http://localhost:3000/
ARG VITE_API_BASE_URL
ARG VITE_LOCAL_IP

# build environment
FROM node:22-alpine AS builder
ARG VITE_SPOTIFY_CLIENT_ID
ARG VITE_SPOTIFY_REDIRECT_URL
ARG VITE_API_BASE_URL
ARG VITE_LOCAL_IP
ENV VITE_SPOTIFY_CLIENT_ID=$VITE_SPOTIFY_CLIENT_ID
ENV VITE_SPOTIFY_REDIRECT_URL=$VITE_SPOTIFY_REDIRECT_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_LOCAL_IP=$VITE_LOCAL_IP
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn run build

# production environment
FROM nginx:alpine
RUN apk upgrade --no-cache \
  && rm -rf /etc/nginx/conf.d
COPY ./docker/nginx/default.conf /etc/nginx/conf.d/
COPY --from=builder /usr/src/app/build /usr/share/nginx/html
RUN chmod +r /usr/share/nginx/html/*
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
