import type { Completion, CompletionContext, CompletionResult, CompletionSource } from '@codemirror/autocomplete'

/** Noms déclarés dans les fichiers du TP (fonctions, types, méthodes, champs), proposés partout. */
export type WorkspaceNames = { globals: Completion[]; members: Completion[] }

const KEYWORDS = new Set(
  'if else for range func return var const type struct interface map chan package import go defer select switch case default break continue fallthrough goto nil true false def class static new in instanceof this super null try catch finally throw throws extends implements private public protected final void boolean int long double float char byte short abstract enum trait as assert while do with'.split(
    ' ',
  ),
)

/** Premier groupe capturé de chaque occurrence de `re` (drapeau `g` requis). */
function caps(src: string, re: RegExp): string[] {
  return [...src.matchAll(re)].map((m) => m[1] ?? '')
}

function add(into: Map<string, Completion>, label: string, type: string, detail?: string) {
  if (label.length < 2 || KEYWORDS.has(label) || into.has(label)) return
  into.set(label, { label, type, detail, boost: -1 })
}

export function goWorkspaceNames(files: string[]): WorkspaceNames {
  const g = new Map<string, Completion>()
  const m = new Map<string, Completion>()
  for (const src of files) {
    for (const name of caps(src, /^func\s+(\w+)\s*[[(]/gm)) add(g, name, 'function', 'TP')
    for (const name of caps(src, /^func\s+\([^)]*\)\s*(\w+)\s*\(/gm)) add(m, name, 'method', 'TP')
    for (const name of caps(src, /^\s*type\s+(\w+)/gm)) add(g, name, 'type', 'TP')
    for (const name of caps(src, /^(?:var|const)\s+(\w+)/gm)) add(g, name, 'variable', 'TP')
    for (const body of caps(src, /struct\s*\{([^}]*)\}/g))
      for (const name of caps(body, /^\s*(\w+)(?:\s*,\s*\w+)*\s+[\w*[\]]/gm)) add(m, name, 'property', 'TP')
    for (const body of caps(src, /interface\s*\{([^}]*)\}/g))
      for (const name of caps(body, /^\s*(\w+)\s*\(/gm)) add(m, name, 'method', 'TP')
  }
  return { globals: [...g.values()], members: [...m.values()] }
}

export function groovyWorkspaceNames(files: string[]): WorkspaceNames {
  const g = new Map<string, Completion>()
  const m = new Map<string, Completion>()
  for (const src of files) {
    for (const name of caps(src, /\b(?:class|interface|trait|enum)\s+(\w+)/g)) add(g, name, 'class', 'TP')
    // Méthodes : `def nom(`, `static Type nom(`, `Type<..> nom(` en début de ligne.
    for (const name of caps(src, /^\s*(?:(?:static|private|public|protected|final|def)\s+)*[\w<>[\],? ]*?\b(\w+)\s*\([^)]*\)\s*\{/gm))
      if (!KEYWORDS.has(name)) {
        add(m, name, 'method', 'TP')
        add(g, name, 'function', 'TP')
      }
    // Propriétés et variables : `Type nom =`, `def nom`, `String nom` en tête de ligne.
    for (const name of caps(src, /^\s*(?:(?:static|private|public|protected|final)\s+)*(?:def|[A-Z][\w<>[\],? ]*|int|long|double|boolean)\s+(\w+)\s*(?:=|$)/gm)) {
      add(m, name, 'property', 'TP')
      add(g, name, 'variable', 'TP')
    }
    // Paramètres de closures : `{ a, b ->`.
    for (const params of caps(src, /\{\s*([\w\s,]+)->/g))
      for (const p of params.split(',')) add(g, p.trim().split(/\s+/).pop() ?? '', 'variable')
  }
  return { globals: [...g.values()], members: [...m.values()] }
}

/** Mots du document courant (variables locales fraîchement tapées). */
export function wordsInDoc(context: CompletionContext, current: string): Completion[] {
  const seen = new Set<string>()
  const out: Completion[] = []
  const text = context.state.doc.toString()
  for (const [w] of text.matchAll(/[A-Za-z_]\w{2,}/g)) {
    if (w === current || seen.has(w) || KEYWORDS.has(w)) continue
    seen.add(w)
    out.push({ label: w, type: 'text', boost: -2 })
  }
  return out
}

/** Le curseur est-il dans un commentaire ou une chaîne simple ? Heuristique sur la ligne courante. */
export function inCommentOrString(context: CompletionContext): boolean {
  const line = context.state.doc.lineAt(context.pos)
  const before = line.text.slice(0, context.pos - line.from)
  if (/^\s*(\/\/|\*|\/\*)/.test(before) || before.includes('//')) return true
  // Interpolation GString/template : `"${user.na` reste du code.
  if (/\$\{[^}]*$/.test(before)) return false
  const quotes = (before.match(/(?<!\\)["'`]/g) ?? []).length
  return quotes % 2 === 1
}

export const IDENT = /^\w*$/

export function result(from: number, options: Completion[]): CompletionResult | null {
  return options.length ? { from, options, validFor: IDENT } : null
}

export type { CompletionSource }
