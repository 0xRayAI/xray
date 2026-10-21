# Root MCP service. The image tag is the Node pin.
FROM node:24.22.1-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
CMD ["node", "mcp-server.mjs"]
