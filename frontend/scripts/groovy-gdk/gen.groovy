// Génère src/lib/completion/groovy-gdk.gen.ts : toutes les méthodes du GDK (Groovy 4)
// et des types JDK courants, lues par réflexion, pour l'autocomplétion de l'éditeur.
//
// Avec l'image du runner (même Groovy que les TP), depuis frontend/ :
//   docker run --rm -v "$PWD:/w" -w /w groovy:4.0-jdk17 groovy scripts/groovy-gdk/gen.groovy > src/lib/completion/groovy-gdk.gen.ts
// Ou avec un JDK et le jar Groovy :
//   java -Dstdout.encoding=UTF-8 -cp groovy-4.x.jar groovy.ui.GroovyMain scripts/groovy-gdk/gen.groovy > src/lib/completion/groovy-gdk.gen.ts

import java.lang.reflect.Method
import java.lang.reflect.Modifier
import org.codehaus.groovy.runtime.DefaultGroovyMethods

// Types dont on expose les méthodes d'instance JDK (en plus du GDK, qui couvre tout).
def instanceTypes = [
    String, CharSequence, StringBuilder, Object, Iterable, Collection, List, Set, Map, Map.Entry,
    Iterator, Number, Integer, Long, Double, BigDecimal, BigInteger, Boolean, Character,
    Optional, java.util.stream.Stream, java.time.LocalDate, java.time.LocalDateTime, java.time.Duration,
    java.util.regex.Matcher, Closure, GString, groovy.lang.Range, Throwable, Comparable,
]
// Classes dont on expose les membres statiques après `Classe.`.
def staticTypes = [
    Math, Collections, Arrays, Objects, System, String, Integer, Long, Double, Boolean, Character,
    BigDecimal, BigInteger, List, Map, Set, Optional, UUID, Thread,
    java.util.stream.Stream, java.util.stream.IntStream, java.util.stream.Collectors,
    java.time.LocalDate, java.time.LocalDateTime, java.time.Duration, java.time.Instant,
    java.util.concurrent.TimeUnit, java.util.regex.Pattern,
]
// Ordre d'affichage des receveurs dans le détail.
def rank = ['String', 'CharSequence', 'List', 'Collection', 'Iterable', 'Map', 'Set', 'Object', 'Number', 'Integer', 'Closure']

// JSON minimal (le jar groovy-json n'est pas dans le noyau) : chaînes, listes, maps.
def toJson
toJson = { v ->
    if (v instanceof Map) return '{' + v.collect { k, x -> toJson(k.toString()) + ':' + toJson(x) }.join(',') + '}'
    if (v instanceof Collection) return '[' + v.collect { toJson(it) }.join(',') + ']'
    '"' + v.toString().replace('\\', '\\\\').replace('"', '\\"') + '"'
}

def name = { Class c -> c.isArray() ? c.componentType.simpleName + '[]' : c.simpleName }
// Les TP tournent sur JDK 17 : si le script tourne sur un JDK plus récent, on écarte ce qu'il a ajouté
// (collections séquencées, Math.clamp…) pour ne pas proposer des méthodes absentes du sandbox.
def jdk21Only = ['getFirst', 'getLast', 'addFirst', 'addLast', 'removeFirst', 'removeLast', 'reversed',
                 'putFirst', 'putLast', 'firstEntry', 'lastEntry', 'pollFirstEntry', 'pollLastEntry',
                 'splitWithDelimiters', 'clamp', 'unmodifiableSequencedCollection',
                 'unmodifiableSequencedSet', 'unmodifiableSequencedMap', 'isEmoji', 'isEmojiPresentation',
                 'isEmojiModifier', 'isEmojiModifierBase', 'isEmojiComponent', 'isExtendedPictographic'] as Set
def newerJdk = Runtime.version().feature() > 17
def visible = { Method m ->
    Modifier.isPublic(m.modifiers) && !m.synthetic && !m.isAnnotationPresent(Deprecated) && !m.name.contains('$') &&
        !(newerJdk && !m.declaringClass.name.startsWith('org.codehaus.groovy') && jdk21Only.contains(m.name)) &&
        !(newerJdk && (m.parameterTypes.toList() + m.returnType).any { it.simpleName.startsWith('Sequenced') })
}

// nom → [receveurs, signature (surcharge la plus courte), nombre de surcharges]
def members = new TreeMap<String, Map>()
def addMember = { String n, String recv, String sig ->
    def e = members.computeIfAbsent(n) { [recv: new LinkedHashSet<String>(), sig: sig, overloads: 0] }
    e.recv << recv
    e.overloads++
    if (sig.count(',') < e.sig.count(',')) e.sig = sig
}

for (Class c in DefaultGroovyMethods.DGM_LIKE_CLASSES) {
    for (Method m in c.methods) {
        if (!visible(m) || !Modifier.isStatic(m.modifiers) || m.declaringClass != c || m.parameterCount == 0) continue
        def params = m.parameterTypes.drop(1).collect(name).join(', ')
        addMember(m.name, name(m.parameterTypes[0]), "(${params}) ${name(m.returnType)}")
    }
}
for (Class c in instanceTypes) {
    for (Method m in c.methods) {
        if (!visible(m) || Modifier.isStatic(m.modifiers)) continue
        addMember(m.name, name(c), "(${m.parameterTypes.collect(name).join(', ')}) ${name(m.returnType)}")
    }
}

def statics = new TreeMap<String, List>()
for (Class c in staticTypes) {
    def entries = new TreeMap<String, List>()
    for (Method m in c.methods) {
        if (!visible(m) || !Modifier.isStatic(m.modifiers)) continue
        entries.putIfAbsent(m.name, [m.name, 'method', "(${m.parameterTypes.collect(name).join(', ')}) ${name(m.returnType)}"])
    }
    for (f in c.fields) {
        if (Modifier.isPublic(f.modifiers) && Modifier.isStatic(f.modifiers)) entries.putIfAbsent(f.name, [f.name, 'constant', name(f.type)])
    }
    statics[c.simpleName] = entries.values().toList()
}

def out = members.collect { n, e ->
    def recv = e.recv.toList().sort { r -> def i = rank.indexOf(r); i < 0 ? rank.size() : i }
    [n, e.sig + (e.overloads > 1 ? " (+${e.overloads - 1})" : ''), recv]
}

println "// Généré par scripts/groovy-gdk (Groovy ${GroovySystem.version}, JDK ${System.getProperty('java.version')}) — ne pas modifier à la main."
println 'export type GroovyMember = [name: string, detail: string, receivers: string[]]'
println 'export type GroovyStatic = [name: string, kind: string, detail: string]'
println "export const GROOVY_MEMBERS: GroovyMember[] = ${toJson(out)}"
println "export const GROOVY_STATICS: Record<string, GroovyStatic[]> = ${toJson(statics)}"
