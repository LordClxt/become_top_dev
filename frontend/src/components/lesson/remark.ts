/* Plugins remark de la leçon : encadrés automatiques et termes du glossaire.
   Types mdast minimaux, pour ne pas dépendre de @types/mdast. */

type Node = {
  type: string
  value?: string
  children?: Node[]
  data?: { hName?: string; hProperties?: Record<string, unknown> }
}

export type CalloutKind = 'java' | 'extra' | 'source' | 'warning' | 'tip' | 'internals' | 'prod'

const LABELS: [RegExp, CalloutKind][] = [
  [/^java \d+/, 'java'],
  [/^au-dela du livre/, 'extra'],
  [/^source/, 'source'],
  [/^attention/, 'warning'],
  [/^astuce/, 'tip'],
  [/^sous le capot/, 'internals'],
  [/^en production/, 'prod'],
]

function plain(n: Node): string {
  return n.value ?? (n.children ?? []).map(plain).join('')
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** `> **Astuce :** …` → blockquote data-callout="tip". */
export function remarkCallouts() {
  return (tree: Node) => {
    const visit = (n: Node) => {
      if (n.type === 'blockquote') {
        const strong = n.children?.[0]?.children?.[0]
        if (n.children?.[0]?.type === 'paragraph' && strong?.type === 'strong') {
          const label = normalize(plain(strong))
          const kind = LABELS.find(([re]) => re.test(label))?.[1]
          if (kind) {
            n.data = { ...n.data, hProperties: { ...n.data?.hProperties, 'data-callout': kind } }
            strong.data = { ...strong.data, hProperties: { className: 'callout-label' } }
          }
        }
      }
      n.children?.forEach(visit)
    }
    visit(tree)
  }
}

const SKIP = new Set(['heading', 'code', 'inlineCode', 'link', 'linkReference', 'html'])

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Première occurrence de chaque terme du glossaire → <dfn data-term>.
 * `used` est partagé entre les segments d'une même leçon : un seul soulignement par terme.
 */
export function remarkGlossary({ terms, used }: { terms: string[]; used: Set<string> }) {
  const sorted = [...terms].sort((a, b) => b.length - a.length)
  return () => (tree: Node) => {
    if (!sorted.length) return
    const visit = (n: Node) => {
      if (SKIP.has(n.type) || !n.children) return
      const next: Node[] = []
      for (const c of n.children) {
        if (c.type !== 'text' || !c.value) {
          visit(c)
          next.push(c)
          continue
        }
        let rest = c.value
        for (;;) {
          let hit: { term: string; index: number; len: number } | null = null
          for (const term of sorted) {
            if (used.has(term)) continue
            const m = new RegExp(`(^|[^\\p{L}\\p{N}])(${escape(term)})(?![\\p{L}\\p{N}])`, 'iu').exec(rest)
            if (m && (!hit || m.index + (m[1]?.length ?? 0) < hit.index)) {
              hit = { term, index: m.index + (m[1]?.length ?? 0), len: m[2]?.length ?? 0 }
            }
          }
          if (!hit) break
          used.add(hit.term)
          if (hit.index > 0) next.push({ type: 'text', value: rest.slice(0, hit.index) })
          next.push({
            type: 'glossaryTerm',
            data: { hName: 'dfn', hProperties: { 'data-term': hit.term } },
            children: [{ type: 'text', value: rest.slice(hit.index, hit.index + hit.len) }],
          })
          rest = rest.slice(hit.index + hit.len)
        }
        if (rest) next.push({ type: 'text', value: rest })
      }
      n.children = next
    }
    visit(tree)
  }
}
