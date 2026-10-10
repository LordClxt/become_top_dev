# Contexte de build : racine du dépôt (les visuels interactifs vivent dans content/).
FROM node:24-slim
RUN npm install -g pnpm@12.8.1

WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
COPY content/ /app/content/
RUN pnpm build

ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node", "server.mjs"]
