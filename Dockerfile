FROM node:lts-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN apk update
RUN apk upgrade
RUN apk add --no-cache ffmpeg

RUN npm install

COPY . ./

RUN npm run build
CMD npm start
