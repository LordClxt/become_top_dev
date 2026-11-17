import { Clapperboard, MousePointerClick } from 'lucide-react'
import { Children, isValidElement, type ReactNode, useMemo } from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from '@/components/CodeBlock'
import { CheckpointCard } from '@/components/lesson/Checkpoint'
import { Callout, CompareBlock, GlossaryTerm, LessonSection, RevealBlock, StepsBlock } from '@/components/lesson/blocks'
import { LessonContext, type LessonContextValue } from '@/components/lesson/context'
import { type Block, parseBlocks, parseMeta } from '@/components/lesson/directives'
import { remarkCallouts, remarkGlossary } from '@/components/lesson/remark'
import type { Checkpoint, Visual } from '@/lib/api'
import { HyperframesPlayer } from '@/visuals/HyperframesPlayer'
import { hyperframesScenes, visualComponents } from '@/visuals/registry'

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

/** Directives ::checkpoint présentes dans le corps (dans l'ordre). */
export function checkpointIds(body: string): string[] {
  return parseBlocks(body).flatMap((b) => (b.kind === 'checkpoint' ? [b.id] : []))
}

export function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : isValidElement<{ children?: ReactNode }>(c) ? textOf(c.props.children) : ''))
    .join('')
}

type Props = {
  body: string
  visuals: Record<string, Visual>
  /** Présents sur la page leçon seulement : points de contrôle et glossaire interactif. */
  lessonId?: string
  language?: string
  checkpoints?: Checkpoint[]
  glossary?: { term: string; definition: string }[]
  /** Colonne étroite (consignes, indices) : pas de bouton copier. */
  compact?: boolean
}

export function LessonBody({ body, visuals, lessonId, language = 'go', checkpoints, glossary, compact }: Props) {
  const blocks = useMemo(() => parseBlocks(body), [body])
  // Recréé à chaque rendu : la première occurrence d'un terme est recalculée dans l'ordre du texte.
  const used = new Set<string>()
  const ctx: LessonContextValue = {
    lessonId,
    language,
    checkpoints: checkpoints ?? [],
    glossary: glossary ?? [],
    used,
    compact: !!compact,
  }
  return (
    <LessonContext value={ctx}>
      <div className="prose-read">
        {blocks.map((b, i) => (
          <BlockView key={i} block={b} visuals={visuals} />
        ))}
      </div>
    </LessonContext>
  )
}

function BlockView({ block, visuals }: { block: Block; visuals: Record<string, Visual> }) {
  switch (block.kind) {
    case 'md':
      return <Md>{block.md}</Md>
    case 'visual':
      return <VisualSlot visual={visuals[block.id]} id={block.id} />
    case 'checkpoint':
      return <CheckpointCard id={block.id} />
    case 'compare':
      return <CompareBlock panes={block.panes} />
    case 'reveal':
      return <RevealBlock title={block.title} md={block.md} />
    case 'steps':
      return <StepsBlock block={block} />
    case 'section':
      return <LessonSection variant={block.variant} title={block.title} id={slugify(block.title)} md={block.md} />
  }
}

/** Markdown de leçon : titres ancrés, code coloré, encadrés, glossaire. */
export function Md({ children, components }: { children: string; components?: Components }) {
  return (
    <LessonContext.Consumer>
      {(ctx) => (
        <Markdown
          remarkPlugins={[
            remarkGfm,
            remarkCallouts,
            remarkGlossary({ terms: ctx.glossary.map((g) => g.term), used: ctx.used }),
          ]}
          components={{
            h2: ({ children }) => (
              <h2 id={slugify(textOf(children))} className="scroll-mt-24">
                {children}
              </h2>
            ),
            pre: ({ children }) => <>{children}</>,
            code: ({ className, children, node }) => {
              const lang = /language-(\w+)/.exec(className ?? '')?.[1]
              const text = String(children)
              if (!lang && !text.includes('\n')) return <code>{children}</code>
              const meta = parseMeta((node?.data as { meta?: string } | undefined)?.meta)
              return (
                <CodeBlock
                  code={text}
                  language={lang ?? ctx.language}
                  title={meta.title}
                  highlight={meta.highlight}
                  copy={!ctx.compact}
                />
              )
            },
            blockquote: (props) => {
              const kind = (props as { 'data-callout'?: string })['data-callout']
              return kind ? <Callout kind={kind}>{props.children}</Callout> : <blockquote>{props.children}</blockquote>
            },
            dfn: (props) => (
              <GlossaryTerm term={String((props as { 'data-term'?: string })['data-term'] ?? '')}>{props.children}</GlossaryTerm>
            ),
            ...components,
          }}
        >
          {children}
        </Markdown>
      )}
    </LessonContext.Consumer>
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

