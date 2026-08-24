FROM node:22-alpine AS node-env

WORKDIR /project

# TODO: Check best pratices alpine apk
RUN apk add openjdk21-jre-headless

COPY package.json yarn.lock ./
COPY lib/package.json ./lib/
COPY app/package.json app/yarn.lock ./app/

RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn yarn install

CMD [ "yarn", "dev", "--host", "0.0.0.0" ]

FROM node-env AS node-build

COPY . .

ARG VITE_BBE2_API_URL
ARG APP_VERSION=dev
ENV VITE_APP_VERSION=${APP_VERSION}
RUN --mount=type=cache,target=/root/.yarn YARN_CACHE_FOLDER=/root/.yarn yarn build

FROM nginx:alpine AS prod

COPY .docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY .docker/config.sh /docker-entrypoint.d/
COPY .docker/app-config.js.template /

COPY --from=node-build /project/app/dist /usr/share/nginx/html
