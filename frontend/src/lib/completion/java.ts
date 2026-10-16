import { snippetCompletion, type Completion, type CompletionContext, type CompletionSource } from '@codemirror/autocomplete'
import { GROOVY_STATICS } from './groovy-gdk.gen'
import { groovyWorkspaceNames, inCommentOrString, result, wordsInDoc } from './workspace'

const list = (names: string, type: string, detail?: string): Completion[] =>
  names
    .split(/\s+/)
    .filter(Boolean)
    .map((label) => ({ label, type, detail }))

const KEYWORDS = list(
  'abstract assert boolean break byte case catch char class continue default do double else enum extends final finally float for if implements import instanceof int interface long new package permits private protected public record return sealed short static super switch synchronized this throw throws transient try var void volatile while yield null true false',
  'keyword',
)

const SNIPPETS: Completion[] = [
  snippetCompletion('public ${Type} ${name}(${params}) {\n\t${}\n}', { label: 'public', detail: 'méthode', type: 'keyword' }),
  snippetCompletion('private ${Type} ${name}(${params}) {\n\t${}\n}', { label: 'private', detail: 'méthode', type: 'keyword' }),
  snippetCompletion('static ${Type} ${name}(${params}) {\n\t${}\n}', { label: 'static', detail: 'méthode statique', type: 'keyword' }),
  snippetCompletion('@Override public ${Type} ${name}(${params}) {\n\t${}\n}', { label: '@Override', detail: 'redéfinition', type: 'keyword' }),
  snippetCompletion('for (${Type} ${item} : ${items}) {\n\t${}\n}', { label: 'for', detail: 'for-each', type: 'keyword' }),
  snippetCompletion('for (int ${i} = 0; ${i} < ${n}; ${i}++) {\n\t${}\n}', { label: 'for', detail: 'indice', type: 'keyword' }),
  snippetCompletion('if (${}) {\n\t${}\n}', { label: 'if', detail: 'bloc', type: 'keyword' }),
  snippetCompletion('if (${}) {\n\t${}\n} else {\n\t${}\n}', { label: 'if', detail: '/ else', type: 'keyword' }),
  snippetCompletion('switch (${value}) {\n\tcase ${X} -> ${};\n\tdefault -> ${};\n}', { label: 'switch', detail: 'flèches', type: 'keyword' }),
  snippetCompletion('try {\n\t${}\n} catch (${Exception} e) {\n\t${}\n}', { label: 'try', detail: '/ catch', type: 'keyword' }),
  snippetCompletion('try (${Type} ${r} = ${}) {\n\t${}\n}', { label: 'try', detail: 'with-resources', type: 'keyword' }),
  snippetCompletion('record ${Name}(${fields}) {\n\t${}\n}', { label: 'record', detail: 'record', type: 'keyword' }),
  snippetCompletion('throw new ${IllegalArgumentException}("${}");', { label: 'throw', detail: 'lever', type: 'keyword' }),
  snippetCompletion('System.out.println(${});', { label: 'sout', detail: 'afficher', type: 'function' }),
]

const CLASSES = list(
  'String StringBuilder Object Integer Long Double Boolean Character Math Objects Optional List ArrayList LinkedList Map HashMap LinkedHashMap TreeMap Set HashSet LinkedHashSet TreeSet EnumSet EnumMap Deque ArrayDeque Iterator Iterable Collection Collections Arrays Comparator Comparable Stream IntStream Collectors Function BiFunction Supplier Consumer Predicate UnaryOperator BinaryOperator Runnable AutoCloseable Closeable Cleaner Pattern Matcher BigDecimal BigInteger Instant Duration LocalDate Exception RuntimeException IllegalArgumentException IllegalStateException NullPointerException UnsupportedOperationException IndexOutOfBoundsException AssertionError WeakReference WeakHashMap System Thread',
  'class',
)

/** Méthodes d'instance JDK fréquentes (pas d'inférence de type : liste à plat). */
const MEMBERS = list(
  'equals hashCode toString getClass compareTo length isEmpty isBlank charAt substring indexOf contains startsWith endsWith trim strip toLowerCase toUpperCase split replace chars matches format formatted repeat append insert reverse add addAll remove removeIf get set put putIfAbsent getOrDefault computeIfAbsent merge containsKey containsValue keySet values entrySet getKey getValue size clear iterator hasNext next forEach stream map filter flatMap reduce collect toList sorted distinct limit skip count anyMatch allMatch noneMatch findFirst min max orElse orElseGet orElseThrow isPresent ifPresent of ofNullable apply accept test run close clean register intValue longValue doubleValue compare thenComparing reversed matcher group find clone copyOf requireNonNull',
  'method',
  'JDK',
)

/** Membres statiques des classes JDK (`Math.`, `Collections.`, `Arrays.`…), partagés avec Groovy. */
const STATICS = new Map(
  Object.entries(GROOVY_STATICS).map(([cls, entries]) => [
    cls,
    entries.map(([label, type, detail]): Completion => ({ label, type, detail })),
  ]),
)

/** Complétion Java : mots-clés, snippets, JDK courant et noms déclarés dans les fichiers du TP. */
export function javaCompletion(otherFiles: string[]): CompletionSource {
  return (context: CompletionContext) => {
    if (inCommentOrString(context)) return null
    const ws = groovyWorkspaceNames([context.state.doc.toString(), ...otherFiles])

    const member = context.matchBefore(/(\w+|[)\]}"])\s*\.\w*$/)
    if (member) {
      const recv = /^(\w+|[)\]}"])/.exec(member.text)?.[1] ?? ''
      if (/^\d+$/.test(recv) && !/\.[A-Za-z_]/.test(member.text)) return null
      const word = context.matchBefore(/\w*$/)!
      const statics = STATICS.get(recv)
      if (statics) return result(word.from, statics)
      return result(word.from, [...ws.members, ...MEMBERS])
    }

    const word = context.matchBefore(/\w+$/)
    if (!word && !context.explicit) return null
    const names = new Set(ws.globals.map((c) => c.label))
    const words = wordsInDoc(context, word?.text ?? '').filter((c) => !names.has(c.label))
    return result(word?.from ?? context.pos, [...SNIPPETS, ...KEYWORDS, ...CLASSES, ...ws.globals, ...words])
  }
}
