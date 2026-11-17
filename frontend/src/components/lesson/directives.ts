import { parseLineSpec } from '@/lib/highlight'

/** Blocs d'une leçon : Markdown ordinaire entrecoupé de directives (contrat, section A). */
export type Block =
  | { kind: 'md'; md: string }
  | { kind: 'visual'; id: string }
  | { kind: 'checkpoint'; id: string }
  | { kind: 'compare'; panes: Pane[] }
  | { kind: 'reveal'; title: string; md: string }
  | { kind: 'steps'; code: string; lang?: string; title?: string; steps: Step[] }
  | { kind: 'section'; variant: 'pitfalls' | 'recap'; title: string; md: string }

export type Pane = { tone: 'bad' | 'good' | 'neutral'; label: string; md: string }
export type Step = { lines: Set<number>; text: string }

const VISUAL = /^::visual\{id="([^"]+)"\}\s*$/
const CHECKPOINT = /^::checkpoint\{id="([^"]+)"\}\s*$/
const OPEN = /^:::(compare|reveal|steps)\b\s*(.*)$/
const FENCE = /^(```+|~~~+)/
const SPECIAL_SECTIONS: Record<string, 'pitfalls' | 'recap'> = {
  'pièges fréquents': 'pitfalls',
  'à retenir': 'recap',
}

/** Meta d'un bloc de code : `title="Alert.java" {3-5}`. */
export function parseMeta(meta: string | null | undefined): { title?: string; highlight?: Set<number> } {
  if (!meta) return {}
  const title = /title="([^"]*)"/.exec(meta)?.[1]
  const spec = /\{([\d,\s-]+)\}/.exec(meta)?.[1]
  return { title, highlight: spec ? parseLineSpec(spec) : undefined }
}

export function parseBlocks(body: string): Block[] {
  const lines = body.split('\n')
  const out: Block[] = []
  let md: string[] = []
  let fence: string | null = null
  const flush = () => {
    if (md.join('').trim()) out.push({ kind: 'md', md: md.join('\n') })
    md = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    // Rien n'est une directive à l'intérieur d'un bloc de code.
    const f = FENCE.exec(line)
    if (fence) {
      if (f && line.trim() === fence) fence = null
      md.push(line)
      continue
    }
    if (f) {
      fence = f[1] ?? '```'
      md.push(line)
      continue
    }

    let m: RegExpExecArray | null
    if ((m = VISUAL.exec(line))) {
      flush()
      out.push({ kind: 'visual', id: m[1] ?? '' })
    } else if ((m = CHECKPOINT.exec(line))) {
      flush()
      out.push({ kind: 'checkpoint', id: m[1] ?? '' })
    } else if ((m = OPEN.exec(line))) {
      flush()
      const inner: string[] = []
      let innerFence: string | null = null
      for (i++; i < lines.length; i++) {
        const l = lines[i] ?? ''
        const lf = FENCE.exec(l)
        if (innerFence) {
          if (lf && l.trim() === innerFence) innerFence = null
        } else if (lf) innerFence = lf[1] ?? '```'
        else if (l.trim() === ':::') break
        inner.push(l)
      }
      const block = directive(m[1] ?? '', (m[2] ?? '').trim(), inner)
      if (block) out.push(block)
    } else if (/^## /.test(line) && SPECIAL_SECTIONS[line.slice(3).trim().toLowerCase()]) {
      flush()
      const title = line.slice(3).trim()
      const inner: string[] = []
      // La section s'arrête au titre suivant, à une citation (source) ou à une directive.
      for (i++; i < lines.length; i++) {
        const l = lines[i] ?? ''
        if (/^#{1,2} |^>|^::/.test(l)) {
          i--
          break
        }
        inner.push(l)
      }
      out.push({ kind: 'section', variant: SPECIAL_SECTIONS[title.toLowerCase()]!, title, md: inner.join('\n') })
    } else {
      md.push(line)
    }
  }
  flush()
  return out
}

function directive(name: string, arg: string, inner: string[]): Block | null {
  if (name === 'reveal') return { kind: 'reveal', title: arg || 'Réfléchis, puis révèle', md: inner.join('\n') }

  if (name === 'compare') {
    const panes: Pane[] = []
    for (const l of inner) {
      const p = /^--- (bad|good|neutral)\s*:?\s*(.*)$/.exec(l)
      if (p) panes.push({ tone: p[1] as Pane['tone'], label: p[2]?.trim() ?? '', md: '' })
      else if (panes.length) panes[panes.length - 1]!.md += `${l}\n`
    }
    return panes.length ? { kind: 'compare', panes } : null
  }

  // steps : un bloc de code, puis des lignes « --- 1-3: texte ».
  const start = inner.findIndex((l) => FENCE.test(l))
  if (start < 0) return null
  const open = inner[start] ?? ''
  const fenceMark = FENCE.exec(open)?.[1] ?? '```'
  const end = inner.findIndex((l, j) => j > start && l.trim() === fenceMark)
  if (end < 0) return null
  const info = open.slice(fenceMark.length).trim()
  const lang = info.split(/\s+/)[0] || undefined
  const steps: Step[] = []
  for (const l of inner.slice(end + 1)) {
    const s = /^--- ([\d,\s-]+):\s*(.*)$/.exec(l)
    if (s) steps.push({ lines: parseLineSpec(s[1] ?? ''), text: s[2] ?? '' })
    else if (steps.length && l.trim()) steps[steps.length - 1]!.text += ` ${l.trim()}`
  }
  return {
    kind: 'steps',
    code: inner.slice(start + 1, end).join('\n'),
    lang,
    title: parseMeta(info).title,
    steps,
  }
}
