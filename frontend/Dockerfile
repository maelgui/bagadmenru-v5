FROM node

WORKDIR /project
COPY package.json yarn.lock ./

RUN yarn

CMD [ "yarn", "dev", "--host", "0.0.0.0" ]
