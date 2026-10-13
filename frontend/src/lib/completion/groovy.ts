import { snippetCompletion, type Completion, type CompletionContext, type CompletionSource } from '@codemirror/autocomplete'
import { groovyWorkspaceNames, inCommentOrString, result, wordsInDoc } from './workspace'

const list = (names: string, type: string, detail?: string): Completion[] =>
  names
    .split(/\s+/)
    .filter(Boolean)
    .map((label) => ({ label, type, detail }))

const KEYWORDS = list(
  'def class interface trait enum extends implements static final private protected public abstract return if else for in while do switch case default break continue try catch finally throw throws new instanceof as assert import package this super null true false void boolean int long double var record sealed permits yield',
  'keyword',
)

const SNIPPETS: Completion[] = [
  snippetCompletion('def ${name}(${params}) {\n\t${}\n}', { label: 'def', detail: 'méthode', type: 'keyword' }),
  snippetCompletion('static ${def} ${name}(${params}) {\n\t${}\n}', { label: 'static', detail: 'méthode statique', type: 'keyword' }),
  snippetCompletion('class ${Name} {\n\t${}\n}', { label: 'class', detail: 'classe', type: 'keyword' }),
  snippetCompletion('{ ${it} ->\n\t${}\n}', { label: '{ ->', detail: 'closure', type: 'keyword' }),
  snippetCompletion('.each { ${it} ->\n\t${}\n}', { label: 'each', detail: 'itérer', type: 'method' }),
  snippetCompletion('for (${item} in ${items}) {\n\t${}\n}', { label: 'for', detail: 'for … in', type: 'keyword' }),
  snippetCompletion('if (${}) {\n\t${}\n}', { label: 'if', detail: 'bloc', type: 'keyword' }),
  snippetCompletion('if (${}) {\n\t${}\n} else {\n\t${}\n}', { label: 'if', detail: '/ else', type: 'keyword' }),
  snippetCompletion('switch (${value}) {\n\tcase ${x}:\n\t\t${}\n\t\tbreak\n\tdefault:\n\t\t${}\n}', { label: 'switch', detail: 'bloc', type: 'keyword' }),
  snippetCompletion('try {\n\t${}\n} catch (${Exception} e) {\n\t${}\n}', { label: 'try', detail: '/ catch', type: 'keyword' }),
  snippetCompletion('static constraints = {\n\t${field} nullable: false, blank: false\n}', { label: 'constraints', detail: 'Grails', type: 'keyword' }),
  snippetCompletion('static mapping = {\n\t${}\n}', { label: 'mapping', detail: 'GORM', type: 'keyword' }),
  snippetCompletion('static hasMany = [${name}: ${Type}]', { label: 'hasMany', detail: 'GORM', type: 'keyword' }),
  snippetCompletion('static belongsTo = [${name}: ${Type}]', { label: 'belongsTo', detail: 'GORM', type: 'keyword' }),
  snippetCompletion('println "${}"', { label: 'println', detail: 'afficher', type: 'function' }),
]

const GLOBALS = [
  ...list('println print printf sprintf sleep use with tap identity evaluate', 'function', 'GDK'),
  ...list('it owner delegate thisObject', 'variable', 'closure'),
  ...list(
    'String GString Integer Long BigDecimal BigInteger Double Boolean Character Object List Map Set LinkedHashMap ArrayList HashMap HashSet TreeMap Range IntRange Closure Date LocalDate LocalDateTime Duration Optional Math Collections Arrays Pattern Matcher StringBuilder Exception RuntimeException IllegalArgumentException IllegalStateException UnsupportedOperationException ValidationException Expando ConfigObject JsonSlurper JsonOutput MarkupBuilder XmlSlurper CompileStatic TypeChecked Canonical ToString EqualsAndHashCode Immutable TupleConstructor Builder Delegate Memoized Lazy Field DelegatesTo',
    'class',
  ),
  ...list('params flash session request response servletContext grailsApplication log', 'variable', 'Grails'),
  ...list('render redirect respond forward chain withForm bindData hasErrors', 'function', 'Grails'),
]

/** Méthodes GDK et JDK les plus utiles, proposées après `.` (pas d'inférence de type). */
const MEMBERS = [
  ...list(
    'each eachWithIndex collect collectEntries collectMany find findAll findResult findResults findIndexOf grep any every inject sum min max count countBy groupBy split withIndex indexed sort toSorted unique toUnique reverse flatten first last head tail init take drop takeWhile dropWhile join size isEmpty contains containsAll plus minus multiply intersect disjoint asImmutable asType toList toSet toArray subMap getAt putAt get put remove removeAll removeIf retainAll keySet values entrySet containsKey containsValue getOrDefault putIfAbsent computeIfAbsent merge with tap asBoolean collate chop permutations combinations transpose step upto downto times sort sum average',
    'method',
    'GDK',
  ),
  ...list(
    'toUpperCase toLowerCase capitalize uncapitalize trim strip stripIndent stripMargin padLeft padRight center startsWith endsWith replace replaceAll replaceFirst substring indexOf lastIndexOf charAt length tokenize readLines eachLine find findAll matches isNumber isInteger isBigDecimal toInteger toLong toBigDecimal toDouble toBoolean format chars denormalize normalize expand unexpand isBlank isAllWhitespace equalsIgnoreCase compareTo hashCode equals toString getClass',
    'method',
    'String',
  ),
  ...list('call curry rcurry ncurry memoize trampoline leftShift rightShift andThen compose dehydrate rehydrate resolveStrategy delegate owner maximumNumberOfParameters parameterTypes', 'method', 'Closure'),
  ...list('save validate delete refresh discard attach merge errors hasErrors properties id version isDirty getPersistentValue addTo removeFrom', 'method', 'GORM'),
]

/** Méthodes statiques GORM, proposées après un nom de classe (`Book.`). */
const STATIC_GORM = [
  ...list('get getAll read load list listOrderBy count exists findAll find where whereAny withCriteria createCriteria executeQuery executeUpdate findWhere findAllWhere withTransaction withNewSession saveAll deleteAll first last', 'method', 'GORM'),
  snippetCompletion('findBy${Property}(${value})', { label: 'findBy…', detail: 'GORM dynamique', type: 'method' }),
  snippetCompletion('findAllBy${Property}(${value})', { label: 'findAllBy…', detail: 'GORM dynamique', type: 'method' }),
  snippetCompletion('countBy${Property}(${value})', { label: 'countBy…', detail: 'GORM dynamique', type: 'method' }),
]

/**
 * Complétion Groovy/Grails : mots-clés, snippets, GDK, GORM et noms déclarés dans
 * les fichiers du TP. Pas de compilateur côté navigateur : c'est une aide lexicale.
 */
export function groovyCompletion(otherFiles: string[]): CompletionSource {
  return (context: CompletionContext) => {
    if (inCommentOrString(context)) return null
    const ws = groovyWorkspaceNames([context.state.doc.toString(), ...otherFiles])

    const member = context.matchBefore(/(\w+|[)\]}'"])\s*\??\.&?\w*$/)
    if (member) {
      const recv = /^(\w+|[)\]}'"])/.exec(member.text)?.[1] ?? ''
      if (/^\d+$/.test(recv) && !/\.[A-Za-z_]/.test(member.text)) return null
      const word = context.matchBefore(/\w*$/)!
      const isClass = /^[A-Z]/.test(recv)
      return result(word.from, [...ws.members, ...(isClass ? STATIC_GORM : []), ...MEMBERS])
    }

    const word = context.matchBefore(/\w+$/)
    if (!word && !context.explicit) return null
    const names = new Set(ws.globals.map((c) => c.label))
    const words = wordsInDoc(context, word?.text ?? '').filter((c) => !names.has(c.label))
    return result(word?.from ?? context.pos, [...SNIPPETS, ...KEYWORDS, ...GLOBALS, ...ws.globals, ...words])
  }
}
