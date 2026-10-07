FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY tsconfig.json ./
COPY src ./src
RUN npm install -D typescript && npx tsc -p tsconfig.json && npm prune --omit=dev
ENV NODE_ENV=production PORT=4000
EXPOSE 4000
CMD ["node", "dist/index.js"]
