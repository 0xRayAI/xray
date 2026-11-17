FROM node:24-bookworm-slim
WORKDIR /app
COPY server.mjs shop.json self-settle.mjs ./
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.mjs"]
