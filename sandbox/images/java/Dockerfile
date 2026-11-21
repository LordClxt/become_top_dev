# Image d'exécution des exercices Java (JDK 25 LTS) : une instance jetable par exécution.
#
# Deux commandes :
#  - `jtest` [préfixe…]  : Java pur, harnais Spec.java (cours Java efficace, Minispring du cours spring) ;
#  - `jboot` [+data] [+flyway] [+security] [+actuator] [préfixe…] : TP Spring Boot 4.1 réels, testés avec
#    JUnit Jupiter (bibliothèques de /opt/libs/spring, voir deps/build.gradle et btd/jboot.sh).

# --- Étape 1 : résoudre une fois les bibliothèques Spring Boot (le bac à sable n'a pas de réseau).
FROM gradle:9-jdk25 AS deps
WORKDIR /deps
COPY deps/build.gradle .
RUN gradle --no-daemon -q copyLibs

# --- Étape 2 : compiler le lanceur JUnit qui affiche les résultats au format `go test -json`.
FROM eclipse-temurin:25-jdk-alpine AS launcher
COPY --from=deps /opt/libs /opt/libs
COPY btd/RunTests.java /src/btd/
RUN mkdir -p /opt/btd && javac --release 25 -proc:none -cp '/opt/libs/spring/base/*' -d /opt/btd /src/btd/RunTests.java

# --- Image finale.
FROM eclipse-temurin:25-jdk-alpine

USER root
# `jtest` compile tous les .java du dossier courant puis lance la classe Test (harnais Spec.java) ;
# ses arguments filtrent les tests par préfixe (ex. `jtest M1` pour un jalon de projet).
# Démarrage rapide : JIT C1 seul et GC série, largement suffisants pour des tests de quelques secondes.
RUN printf '%s\n' '#!/bin/sh' \
 'set -e' \
 'out=$(mktemp -d)' \
 'javac -encoding UTF-8 -J-XX:TieredStopAtLevel=1 -J-XX:+UseSerialGC -d "$out" $(find . -name "*.java")' \
 'exec java -Dfile.encoding=UTF-8 -XX:TieredStopAtLevel=1 -XX:+UseSerialGC -cp "$out" Test "$@"' \
 > /usr/local/bin/jtest && chmod +x /usr/local/bin/jtest

COPY --from=deps /opt/libs /opt/libs
COPY --from=launcher /opt/btd /opt/btd
COPY btd/logback.xml /opt/btd/
COPY btd/quiz/logback.xml /opt/btd/quiz/
COPY btd/jboot.sh /usr/local/bin/jboot
RUN chmod 755 /usr/local/bin/jboot && chmod -R a+rX /opt/libs /opt/btd \
 && mkdir -p /work && chown -R 65534:65534 /work
ENV HOME=/tmp
USER 65534:65534
WORKDIR /work
