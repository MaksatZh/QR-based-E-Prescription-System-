FROM node:18-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --legacy-peer-deps

COPY src ./src
COPY tsconfig.json ./
COPY data ./data

RUN npm run build
RUN npx prisma generate

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]