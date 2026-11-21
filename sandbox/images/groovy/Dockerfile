# Image d'exécution des exercices Groovy (JDK 17 + Groovy 4, comme Grails 7) : une instance jetable par exécution.
#
# Deux modes :
#  - `groovy Test.groovy`  : Groovy seul (modules Groovy, harnais Spec.groovy) ;
#  - `spock-boot` / `spock-grails` [préfixe…] : TP Spring Boot 3.5 / Grails 7.2 réels, testés avec Spock
#    (bibliothèques de /opt/libs/boot ou /opt/libs/grails, voir deps/build.gradle et btd/spock.sh).

# --- Étape 1 : résoudre une fois les bibliothèques Spring Boot 3.5 / Grails 7.2 (le bac à sable n'a pas de réseau).
FROM gradle:8.14-jdk17 AS deps
WORKDIR /deps
COPY deps/build.gradle .
RUN gradle --no-daemon -q copyLibs

# --- Étape 2 : compiler le lanceur Spock qui affiche les résultats au format `go test -json`.
FROM eclipse-temurin:17-jdk AS launcher
COPY --from=deps /opt/libs /opt/libs
COPY btd/ /src/btd/
RUN mkdir -p /opt/btd && java -cp '/opt/libs/boot/*' org.codehaus.groovy.tools.FileSystemCompiler -d /opt/btd /src/btd/RunSpecs.groovy

# --- Image finale.
FROM groovy:4.0-jdk17

USER root
# Le script `groovy` officiel ajoute --add-modules=ALL-SYSTEM, d'où des avertissements « incubator »
# dans la sortie des tests. On lance GroovyStarter directement : même comportement, sortie propre.
RUN printf '%s\n' '#!/bin/sh' \
 'exec java -Dfile.encoding=UTF-8 -Dgroovy.home="$GROOVY_HOME" -classpath "$GROOVY_HOME/lib/groovy-$GROOVY_VERSION.jar" \' \
 '  org.codehaus.groovy.tools.GroovyStarter --main groovy.ui.GroovyMain --conf "$GROOVY_HOME/conf/groovy-starter.conf" --classpath . "$@"' \
 > /usr/local/bin/groovy && chmod +x /usr/local/bin/groovy

COPY --from=deps /opt/libs /opt/libs
COPY --from=launcher /opt/btd /opt/btd
COPY btd/spock.sh /usr/local/bin/spock-boot
RUN chmod 755 /usr/local/bin/spock-boot && ln -s spock-boot /usr/local/bin/spock-grails \
 && mkdir -p /work && chown -R 65534:65534 /work
ENV HOME=/tmp
USER 65534:65534
WORKDIR /work
