import { Clapperboard, MousePointerClick } from 'lucide-react'
import { Children, isValidElement, type ReactNode, useMemo } from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from '@/components/CodeBlock'
import { CheckpointCard } from '@/components/lesson/Checkpoint'
import { Callout, CompareBlock, GlossaryTerm, LessonSection, RevealBlock, StepsBlock } from '@/components/lesson/blocks'
import { LessonContext, type LessonContextValue } from '@/components/lesson/context'
import { type Block, parseBlocks, parseMeta } from '@/components/lesson/directives'
import { glossaryByBlock, remarkCallouts, remarkGlossary } from '@/components/lesson/remark'
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

export type LessonSectionRef = { id: string; title: string; level: 2 | 3 }

/** Sections de niveaux 2 et 3 de la leçon (hors blocs de code), pour le sommaire et la reprise de lecture. */
export function lessonSections(body: string): LessonSectionRef[] {
  const prose = body.replace(/^```[\s\S]*?^```/gm, '')
  return [...prose.matchAll(/^(#{2,3}) (.+)$/gm)].map((m) => {
    const title = (m[2] ?? '').replace(/`/g, '')
    return { id: slugify(title), title, level: m[1] === '###' ? 3 : 2 }
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
  const terms = useMemo(
    () => glossaryByBlock(blocks.map(blockText), (glossary ?? []).map((g) => g.term)),
    [blocks, glossary],
  )
  const ctx: LessonContextValue = {
    lessonId,
    language,
    checkpoints: checkpoints ?? [],
    checkpointOrder: blocks.flatMap((b) => (b.kind === 'checkpoint' && checkpoints?.some((c) => c.id === b.id) ? [b.id] : [])),
    glossary: glossary ?? [],
    glossaryTerms: [],
    compact: !!compact,
  }
  return (
    <LessonContext value={ctx}>
      <div className="prose-read">
        {blocks.map((b, i) => (
          <LessonContext key={i} value={{ ...ctx, glossaryTerms: terms[i] ?? [] }}>
            <BlockView block={b} visuals={visuals} />
          </LessonContext>
        ))}
      </div>
    </LessonContext>
  )
}

function blockText(b: Block): string {
  if (b.kind === 'md' || b.kind === 'reveal' || b.kind === 'section') return b.md
  if (b.kind === 'compare') return b.panes.map((p) => p.md).join('\n')
  if (b.kind === 'steps') return b.steps.map((s) => s.text).join('\n')
  return ''
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
            remarkGlossary({ terms: ctx.glossaryTerms }),
          ]}
          components={{
            h2: ({ children }) => (
              <h2 id={slugify(textOf(children))} className="scroll-mt-24">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 id={slugify(textOf(children))} className="scroll-mt-24">
                {children}
              </h3>
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

