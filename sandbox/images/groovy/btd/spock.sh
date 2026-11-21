#!/bin/sh
# Compile tous les .groovy/.java du dossier courant (code + spécifications) puis lance les specs Spock.
# Installé deux fois : `spock-boot` (Spring Boot 3.5 pur) et `spock-grails` (Grails 7.2 + GORM).
# Arguments : `+security` ajoute Spring Security au classpath (spock-boot) ; les autres sont des préfixes
# de noms de classes de spec à lancer (ex. `spock-grails M1` pour un jalon de projet).
set -e
case "$(basename "$0")" in
  spock-grails) cp="/opt/libs/grails/*" ;;
  *)            cp="/opt/libs/boot/*" ;;
esac
while [ "${1#+}" != "$1" ]; do
  extra="/opt/libs/extra/${1#+}"
  [ -d "$extra" ] || { echo "option inconnue : $1" >&2; exit 2; }
  cp="$cp:$extra/*"; shift
done
out=$(mktemp -d)
# --parameters : garde les noms de paramètres (Spring lie @RequestParam/@PathVariable par nom, comme Gradle le fait).
# JIT C1 seul + GC série : démarrage plus rapide, suffisant pour des tests de quelques secondes.
# 70 % de la mémoire du conteneur pour le tas (25 % par défaut, trop juste pour Hibernate).
opts="-Dfile.encoding=UTF-8 -XX:TieredStopAtLevel=1 -XX:+UseSerialGC -XX:MaxRAMPercentage=70 -Xshare:auto"
java $opts -cp "$cp" org.codehaus.groovy.tools.FileSystemCompiler -j --parameters -d "$out" \
  $(find . -name '*.groovy' -o -name '*.java')
# Fichiers de configuration et ressources (application.yml, schema.sql, …) : servis depuis le classpath.
find . -maxdepth 1 \( -name '*.yml' -o -name '*.yaml' -o -name '*.properties' -o -name '*.sql' \) \
  -exec cp {} "$out"/ \;
exec java $opts -Dspring.main.banner-mode=off -cp "$out:/opt/btd:$cp" btd.RunSpecs "$out" "$@"
