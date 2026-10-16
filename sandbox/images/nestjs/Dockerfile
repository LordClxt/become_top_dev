# Image d'exécution des exercices NestJS : une instance jetable par exécution, réseau coupé.
# Nest exige les décorateurs legacy + emitDecoratorMetadata : on compile avec tsc 6 (pas de suppression de types).
FROM node:24-alpine

USER root
WORKDIR /opt/nest
COPY package.json ./
RUN npm install --no-fund --no-audit && npm cache clean --force
COPY tsconfig.json report-tsc.mjs ./
COPY nesttest /usr/local/bin/nesttest
RUN chmod +x /usr/local/bin/nesttest && mkdir -p /work && chown -R 65534:65534 /work
ENV HOME=/tmp NODE_NO_WARNINGS=1
USER 65534:65534
WORKDIR /work
