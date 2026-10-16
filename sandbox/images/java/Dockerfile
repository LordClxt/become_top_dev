# Image d'exécution des exercices Java (JDK 21 LTS) : une instance jetable par exécution.
FROM eclipse-temurin:21-jdk-alpine

USER root
# `jtest` compile tous les .java du dossier courant puis lance la classe Test (harnais Spec.java) ;
# ses arguments filtrent les tests par préfixe (ex. `jtest M1` pour un jalon de projet).
# Démarrage rapide : JIT C1 seul et GC série, largement suffisants pour des tests de quelques secondes.
RUN printf '%s\n' '#!/bin/sh' \
 'set -e' \
 'out=$(mktemp -d)' \
 'javac -encoding UTF-8 -J-XX:TieredStopAtLevel=1 -J-XX:+UseSerialGC -d "$out" $(find . -name "*.java")' \
 'exec java -Dfile.encoding=UTF-8 -XX:TieredStopAtLevel=1 -XX:+UseSerialGC -cp "$out" Test "$@"' \
 > /usr/local/bin/jtest && chmod +x /usr/local/bin/jtest \
 && mkdir -p /work && chown -R 65534:65534 /work
ENV HOME=/tmp
USER 65534:65534
WORKDIR /work
