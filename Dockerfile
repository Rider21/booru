FROM node:lts-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN apk update
RUN apk upgrade
RUN apk add --no-cache ffmpeg

RUN npm install && npx tsc

COPY . ./

CMD npm start
