FROM node AS node-env

WORKDIR /project
COPY package.json yarn.lock ./

RUN yarn install

CMD [ "yarn", "dev", "--host", "0.0.0.0" ]

FROM node-env AS node-build

COPY . .

ARG VITE_BBE2_API_URL
ARG VITE_OIDC_PROVIDER_URL
RUN yarn build

FROM nginx:alpine AS prod

COPY --from=node-build /project/dist /usr/share/nginx/html
