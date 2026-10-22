# Root MCP service. The image tag is the Node pin.
FROM node:24.22.1-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
# The root postinstall wears a consumer tree. This layer does not contain that script.
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build
ENV NODE_ENV=production
CMD ["node", "mcp-server.mjs"]
