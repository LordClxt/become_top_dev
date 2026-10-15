import { Clapperboard, MousePointerClick } from 'lucide-react'
import { Children, isValidElement, type ReactNode } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from '@/components/CodeBlock'
import type { Visual } from '@/lib/api'
import { HyperframesPlayer } from '@/visuals/HyperframesPlayer'
import { hyperframesScenes, visualComponents } from '@/visuals/registry'

const DIRECTIVE = /^::visual\{id="([^"]+)"\}\s*$/m

/** Découpe le Markdown autour des directives ::visual{id="…"}. */
function segments(body: string): ({ md: string } | { visual: string })[] {
  const out: ({ md: string } | { visual: string })[] = []
  let rest = body
  for (let m = rest.match(DIRECTIVE); m; m = rest.match(DIRECTIVE)) {
    out.push({ md: rest.slice(0, m.index) })
    out.push({ visual: m[1] ?? '' })
    rest = rest.slice((m.index ?? 0) + m[0].length)
  }
  out.push({ md: rest })
  return out
}

/** Ancre stable d'un titre : « Surprise n°1 : la map nil » → « surprise-n1-la-map-nil ». */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Sections de niveau 2 de la leçon, pour le sommaire. */
export function lessonSections(body: string): { id: string; title: string }[] {
  return [...body.matchAll(/^## (.+)$/gm)].map((m) => {
    const title = (m[1] ?? '').replace(/`/g, '')
    return { id: slugify(title), title }
  })
}

function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : isValidElement<{ children?: ReactNode }>(c) ? textOf(c.props.children) : ''))
    .join('')
}

export function LessonBody({ body, visuals }: { body: string; visuals: Record<string, Visual> }) {
  return (
    <div className="prose-read">
      {segments(body).map((seg, i) =>
        'md' in seg ? (
          <Markdown
            key={i}
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => (
                <h2 id={slugify(textOf(children))} className="scroll-mt-24">
                  {children}
                </h2>
              ),
              pre: ({ children }) => <>{children}</>,
              code: ({ className, children }) => {
                const lang = /language-(\w+)/.exec(className ?? '')?.[1]
                const text = String(children)
                return lang || text.includes('\n') ? (
                  <CodeBlock code={text} language={lang} />
                ) : (
                  <code>{children}</code>
                )
              },
            }}
          >
            {seg.md}
          </Markdown>
        ) : (
          <VisualSlot key={i} visual={visuals[seg.visual]} id={seg.visual} />
        ),
      )}
    </div>
  )
}

function VisualSlot({ visual, id }: { visual?: Visual; id: string }) {
  const Component = visualComponents[id]
  const scene = hyperframesScenes[id]
  return (
    <figure className="relative isolate my-10 overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="bg-grid pointer-events-none absolute -top-24 -right-24 -z-10 size-80" aria-hidden="true" />
      <div className="glow-accent pointer-events-none absolute -top-16 -right-10 -z-10 size-48 rounded-full" aria-hidden="true" />
      <div className="flex items-center gap-2 border-b border-line px-5 py-3 text-sm">
        {scene ? <Clapperboard className="size-4 text-accent" /> : <MousePointerClick className="size-4 text-accent" />}
        <span className="font-medium">{scene ? 'Animation' : 'Visuel interactif'}</span>
        <span className="text-muted">{scene ? 'à rejouer et parcourir' : 'à manipuler'}</span>
      </div>
      <div className="p-5">
        {scene ? (
          <HyperframesPlayer html={scene} title={visual?.justification ?? id} />
        ) : Component ? (
          <Component />
        ) : (
          <p className="text-sm text-muted">Visuel interactif en préparation.</p>
        )}
      </div>
      {visual && (
        <figcaption className="border-t border-line px-5 py-3 text-sm text-muted">{visual.justification}</figcaption>
      )}
    </figure>
  )
}
