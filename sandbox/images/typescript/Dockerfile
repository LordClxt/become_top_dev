# Image d'exécution des exercices TypeScript : une instance jetable par exécution.
# Node 24 exécute le .ts directement (suppression des types) ; tsc 7 ne sert qu'à vérifier les types.
FROM node:24-alpine

USER root
RUN npm install -g --no-fund --no-audit typescript@7.0.2 @types/node@24.19.2 && npm cache clean --force
COPY tsconfig.json report-tsc.mjs /opt/tstest/
COPY tstest /usr/local/bin/tstest
RUN chmod +x /usr/local/bin/tstest && mkdir -p /work && chown -R 65534:65534 /work
ENV HOME=/tmp NODE_NO_WARNINGS=1
USER 65534:65534
WORKDIR /work
