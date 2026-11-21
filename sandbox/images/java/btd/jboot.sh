#!/bin/sh
# TP Spring Boot 4.1 (cours `spring`) : compile tous les .java du dossier courant (code + tests JUnit)
# puis lance les tests avec btd.RunTests (sortie au format `go test -json`).
#
# Usage : jboot [+data] [+flyway] [+security] [+actuator] [préfixe…]
#   +data      JDBC, Data JPA (Hibernate 7), H2
#   +flyway    migrations Flyway (ajoute +data)
#   +security  Spring Security 7 (sa seule présence protège toutes les routes)
#   +actuator  Actuator + Micrometer
# Les autres arguments sont des préfixes de noms de classes de test (ex. `jboot M1` pour un jalon).
set -e
libs=/opt/libs/spring
dirs="$libs/base"
while [ "${1#+}" != "$1" ]; do
  extra="$libs/extra/${1#+}"
  [ -d "$extra" ] || { echo "option inconnue : $1 (options : +data +flyway +security +actuator)" >&2; exit 2; }
  [ "$1" = "+flyway" ] && dirs="$dirs $libs/extra/data"
  dirs="$dirs $extra"; shift
done

# Classpath explicite : un même jar présent dans deux extras n'est gardé qu'une fois.
cp="" seen=" "
for d in $dirs; do
  for jar in "$d"/*.jar; do
    name=$(basename "$jar")
    case "$seen" in *" $name "*) continue ;; esac
    seen="$seen$name "
    cp="${cp:+$cp:}$jar"
  done
done

out=$(mktemp -d)
srcs=$(find . -name '*.java')
[ -n "$srcs" ] || { echo "Aucun fichier .java trouvé." >&2; exit 2; }
# -parameters : garde les noms des paramètres (Spring lie @PathVariable/@RequestParam par nom, comme Maven et Gradle).
# JIT C1 seul + GC série : démarrage plus rapide, suffisant pour des tests de quelques secondes.
javac -encoding UTF-8 --release 25 -parameters -proc:none -Xlint:-options \
  -J-XX:TieredStopAtLevel=1 -J-XX:+UseSerialGC -cp "$cp" -d "$out" $srcs

# Ressources servies depuis le classpath : fichiers de configuration à la racine, et dossiers usuels.
find . -maxdepth 1 \( -name '*.yml' -o -name '*.yaml' -o -name '*.properties' -o -name '*.sql' -o -name '*.xml' \) \
  -exec cp {} "$out"/ \;
for d in META-INF db static templates; do [ -d "$d" ] && cp -R "$d" "$out"/; done

# Tas : 60 % de la mémoire du conteneur. Métaspace plafonnée : une erreur lisible plutôt qu'un conteneur tué (137).
# EnableDynamicAgentLoading : Mockito s'attache à la volée, sans l'avertissement du JDK 25.
# -PrintWarnings : dès que Mockito s'attache, la JVM signale que le partage de classes CDS est réduit
# (« bootstrap classpath has been appended ») : du bruit sur lequel l'apprenant ne peut rien.
exec java -Dfile.encoding=UTF-8 -XX:TieredStopAtLevel=1 -XX:+UseSerialGC -XX:MaxRAMPercentage=60 \
  -XX:MaxMetaspaceSize=160m -Xshare:auto -XX:+EnableDynamicAgentLoading -XX:-PrintWarnings \
  -Dlogging.level.root=WARN -Dspring.main.banner-mode=off \
  -cp "$out:/opt/btd:$cp" btd.RunTests "$out" "$@"
