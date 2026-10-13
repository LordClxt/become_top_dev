import type { Completion, CompletionContext, CompletionSource } from '@codemirror/autocomplete'
import { GO_STDLIB } from './go-stdlib.gen'
import { goWorkspaceNames, inCommentOrString, result } from './workspace'

/** Membres exportés par nom de paquet (`strings`, `rand`, `utf8`…). */
const PACKAGES = new Map<string, Completion[]>()
/** Méthodes des types standard (`sb.WriteString`, `wg.Wait`, `d.Seconds`…), sans inférence de type. */
const STD_METHODS: Completion[] = []
/** Chemins d'import, pour compléter dans `import "…"`. */
const IMPORT_PATHS: Completion[] = []

const methodOwners = new Map<string, { recv: string[]; sig: string }>()
for (const pkg of GO_STDLIB) {
  const name = pkg.path.split('/').filter((s) => !/^v\d+$/.test(s)).pop() ?? pkg.path
  PACKAGES.set(
    name,
    pkg.members.map(([label, kind, detail]) => ({ label, type: kind, detail: detail || undefined })),
  )
  for (const [label, , detail] of pkg.methods) {
    const [recv = '', ...sig] = detail.split(' ')
    const m = methodOwners.get(label) ?? { recv: [], sig: sig.join(' ') }
    m.recv.push(recv)
    methodOwners.set(label, m)
  }
  IMPORT_PATHS.push({ label: pkg.path, type: 'namespace' })
}

for (const [label, { recv, sig }] of methodOwners) {
  const detail = recv.length === 1 ? `${recv[0]} ${sig}` : recv.slice(0, 3).join(', ') + (recv.length > 3 ? '…' : '')
  STD_METHODS.push({ label, type: 'method', detail, boost: -3 })
}

const BUILTINS: Completion[] = [
  ...'append cap clear close complex copy delete imag len make max min new panic print println real recover'
    .split(' ')
    .map((label) => ({ label, type: 'function', detail: 'builtin' })),
  ...'any bool byte comparable complex128 complex64 error float32 float64 int int16 int32 int64 int8 rune string uint uint16 uint32 uint64 uint8 uintptr'
    .split(' ')
    .map((label) => ({ label, type: 'type' })),
  { label: 'iota', type: 'constant' },
]

const PACKAGE_NAMES: Completion[] = [...PACKAGES.keys()].map((label) => ({ label, type: 'namespace', boost: -1 }))

/**
 * Complétion Go hors analyse sémantique : paquets standard après `pkg.`, builtins,
 * noms déclarés dans les autres fichiers du TP, et mots déjà présents.
 * Les snippets et variables locales viennent déjà de `@codemirror/lang-go`.
 */
export function goCompletion(otherFiles: string[]): CompletionSource {
  // Les noms du fichier courant viennent de la complétion locale de lang-go.
  const others = goWorkspaceNames(otherFiles)
  return (context: CompletionContext) => {
    const line = context.state.doc.lineAt(context.pos)
    const before = line.text.slice(0, context.pos - line.from)

    const imp = /^\s*(?:import\s+)?(?:\w+\s+)?"([\w/.]*)$/.exec(before)
    const inImport = /^\s*import\b/.test(before) || /\bimport\s*\([^)]*$/.test(context.state.sliceDoc(0, context.pos))
    if (imp && inImport) return { from: context.pos - (imp[1] ?? '').length, options: IMPORT_PATHS, validFor: /^[\w/.]*$/ }
    if (inCommentOrString(context)) return null

    const member = context.matchBefore(/(\w+|[)\]])\s*\.\w*$/)
    if (member) {
      const recv = /^(\w+|[)\]])/.exec(member.text)?.[1] ?? ''
      if (/^\d/.test(recv)) return null
      const word = context.matchBefore(/\w*$/)!
      const pkg = PACKAGES.get(recv)
      if (pkg) return result(word.from, pkg)
      const here = goWorkspaceNames([context.state.doc.toString()])
      return result(word.from, [...here.members, ...others.members, ...STD_METHODS])
    }

    const word = context.matchBefore(/\w+$/)
    if (!word && !context.explicit) return null
    const from = word?.from ?? context.pos
    return result(from, [...BUILTINS, ...PACKAGE_NAMES, ...others.globals])
  }
}
