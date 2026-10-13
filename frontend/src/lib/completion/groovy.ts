import { snippetCompletion, type Completion, type CompletionContext, type CompletionSource } from '@codemirror/autocomplete'
import { GRAILS_API } from './grails-api.gen'
import { GROOVY_MEMBERS, GROOVY_STATICS } from './groovy-gdk.gen'
import { groovyWorkspaceNames, inCommentOrString, result, wordsInDoc } from './workspace'

const list = (names: string, type: string, detail?: string): Completion[] =>
  names
    .split(/\s+/)
    .filter(Boolean)
    .map((label) => ({ label, type, detail }))

/** Entrées générées depuis les sources de Grails, avec leur signature. */
const grails = (group: keyof typeof GRAILS_API, origin: string): Completion[] =>
  GRAILS_API[group].map(([label, type, detail]) => ({ label, type, detail: `${origin} · ${detail}` }))

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
  snippetCompletion('static hasOne = [${name}: ${Type}]', { label: 'hasOne', detail: 'GORM', type: 'keyword' }),
  snippetCompletion("static transients = ['${name}']", { label: 'transients', detail: 'GORM', type: 'keyword' }),
  snippetCompletion("static embedded = ['${name}']", { label: 'embedded', detail: 'GORM', type: 'keyword' }),
  snippetCompletion('println "${}"', { label: 'println', detail: 'afficher', type: 'function' }),
]

const GLOBALS = [
  ...list('println print printf sprintf sleep use with tap identity evaluate', 'function', 'GDK'),
  ...list('it owner delegate thisObject', 'variable', 'closure'),
  ...list(
    'String GString Integer Long BigDecimal BigInteger Double Boolean Character Object List Map Set LinkedHashMap ArrayList HashMap HashSet TreeMap Range IntRange Closure Date LocalDate LocalDateTime Duration Optional Math Collections Arrays Pattern Matcher StringBuilder Exception RuntimeException IllegalArgumentException IllegalStateException UnsupportedOperationException ValidationException Expando ConfigObject JsonSlurper JsonOutput MarkupBuilder XmlSlurper CompileStatic TypeChecked Canonical ToString EqualsAndHashCode Immutable TupleConstructor Builder Delegate Memoized Lazy Field DelegatesTo',
    'class',
  ),
  // API des contrôleurs Grails (render, redirect, params…), générée depuis les sources de Grails.
  ...grails('controller', 'Grails'),
  { label: 'log', type: 'variable', detail: 'Grails · Logger' },
]

/** Méthodes GDK et JDK après `.`, générées depuis Groovy 4 (pas d'inférence de type). */
const ALL_MEMBERS: (Completion & { receivers: string[] })[] = GROOVY_MEMBERS.map(([label, sig, receivers]) => ({
  label,
  type: 'method',
  detail: `${sig} · ${receivers.slice(0, 3).join(', ')}${receivers.length > 3 ? '…' : ''}`,
  receivers,
}))
const STRING_RECEIVERS = new Set(['String', 'CharSequence', 'GString', 'Object', 'Comparable'])
/** Après un littéral `'…'.` ou `"…".` : seulement ce qui s'applique à une chaîne. */
const STRING_MEMBERS = ALL_MEMBERS.filter((c) => c.receivers.some((r) => STRING_RECEIVERS.has(r)))

/** Méthodes d'instance GORM et `Validateable` (`save`, `validate`, `errors`…), absentes du GDK. */
const GORM_MEMBERS = [...grails('gormInstance', 'GORM'), ...grails('validateable', 'Validateable')]
const MEMBERS = [...ALL_MEMBERS, ...GORM_MEMBERS]

/** Membres statiques des classes JDK courantes (`Math.`, `Collections.`, `LocalDate.`…). */
const STATICS = new Map(
  Object.entries(GROOVY_STATICS).map(([cls, entries]) => [
    cls,
    entries.map(([label, type, detail]): Completion => ({ label, type, detail })),
  ]),
)

/** Méthodes statiques GORM, proposées après un nom de classe (`Book.`). */
const STATIC_GORM = [
  ...grails('gormStatic', 'GORM'),
  snippetCompletion('findBy${Property}(${value})', { label: 'findBy…', detail: 'GORM dynamique', type: 'method' }),
  snippetCompletion('findAllBy${Property}(${value})', { label: 'findAllBy…', detail: 'GORM dynamique', type: 'method' }),
  snippetCompletion('countBy${Property}(${value})', { label: 'countBy…', detail: 'GORM dynamique', type: 'method' }),
  snippetCompletion('findOrCreateBy${Property}(${value})', { label: 'findOrCreateBy…', detail: 'GORM dynamique', type: 'method' }),
  snippetCompletion('listOrderBy${Property}()', { label: 'listOrderBy…', detail: 'GORM dynamique', type: 'method' }),
]

/**
 * Complétion Groovy/Grails : mots-clés, snippets, tout le GDK, GORM et noms déclarés dans
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
      const statics = STATICS.get(recv)
      if (statics) return result(word.from, statics)
      if (recv === "'" || recv === '"') return result(word.from, STRING_MEMBERS)
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
