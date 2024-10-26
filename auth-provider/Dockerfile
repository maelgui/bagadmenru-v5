FROM node:lts-alpine

WORKDIR /app

COPY package.json yarn.lock /app/
RUN yarn

COPY prisma /app/prisma
RUN yarn generate

COPY tsconfig.json /app/
COPY src /app/src
RUN yarn build

COPY public /app/public
ENV NODE_ENV=production
CMD [ "yarn", "start" ]
