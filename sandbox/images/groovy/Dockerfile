# Image d'exécution des exercices Groovy (JDK 17 + Groovy 4, comme Grails 7) : une instance jetable par exécution.
FROM groovy:4.0-jdk17

USER root
# Le script `groovy` officiel ajoute --add-modules=ALL-SYSTEM, d'où des avertissements « incubator »
# dans la sortie des tests. On lance GroovyStarter directement : même comportement, sortie propre.
RUN printf '%s\n' '#!/bin/sh' \
 'exec java -Dfile.encoding=UTF-8 -Dgroovy.home="$GROOVY_HOME" -classpath "$GROOVY_HOME/lib/groovy-$GROOVY_VERSION.jar" \' \
 '  org.codehaus.groovy.tools.GroovyStarter --main groovy.ui.GroovyMain --conf "$GROOVY_HOME/conf/groovy-starter.conf" --classpath . "$@"' \
 > /usr/local/bin/groovy && chmod +x /usr/local/bin/groovy \
 && mkdir -p /work && chown -R 65534:65534 /work
ENV HOME=/tmp
USER 65534:65534
WORKDIR /work
