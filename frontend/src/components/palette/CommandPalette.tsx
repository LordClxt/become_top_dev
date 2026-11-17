import { useQueries, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpen,
  Brain,
  CornerDownLeft,
  FlaskConical,
  GraduationCap,
  History,
  Layers,
  type LucideIcon,
  Palette,
  Search,
  Settings,
  UserRound,
} from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { coursesQuery, sandboxQuery } from '@/features/courses/queries'
import { todayQuery } from '@/features/review/queries'
import { api } from '@/lib/api'
import { toggleTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { score } from './search'

type Group = 'Actions' | 'Cours' | 'Modules' | 'Leçons' | 'Exercices' | 'Récents'
type Item = {
  key: string
  group: Group
  title: string
  hint?: string
  icon: LucideIcon
  /** Chemin TanStack + paramètres, ou une action. */
  go: { to: string; params?: Record<string, string> } | { run: () => void }
}

const RECENT_KEY = 'btd-palette-recent'
const GROUP_ORDER: Group[] = ['Actions', 'Cours', 'Modules', 'Leçons', 'Exercices']
const MAX_PER_GROUP = 6

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}
function pushRecent(key: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([key, ...readRecent().filter((k) => k !== key)].slice(0, 6)))
  } catch {
    // stockage indisponible : pas d'historique
  }
}

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || !!el.closest('.cm-editor'))
}

/** Palette de commandes : Ctrl/Cmd+K, « / » hors saisie, ou l'événement `btd:palette`. */
export function CommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    const onEvent = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('btd:palette', onEvent)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('btd:palette', onEvent)
    }
  }, [])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="palette-in fixed top-[12vh] left-1/2 z-50 flex max-h-[70vh] w-[calc(100vw-2rem)] max-w-[640px] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
        >
          <DialogPrimitive.Title className="sr-only">Aller à</DialogPrimitive.Title>
          {open && <PaletteBody onClose={() => setOpen(false)} />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Chargé à l'ouverture seulement, puis gardé en cache par react-query.
  const { data: courses } = useQuery({ ...coursesQuery, staleTime: 5 * 60_000 })
  const { data: sandbox } = useQuery({ ...sandboxQuery, staleTime: 5 * 60_000 })
  const { data: today } = useQuery(todayQuery)
  const chapterIds = (courses ?? []).flatMap((c) => c.tracks.flatMap((t) => t.chapters)).flatMap((c) => (c.available ? [c.id] : []))
  const chapters = useQueries({
    queries: chapterIds.map((id) => ({ queryKey: ['chapter', id], queryFn: () => api.chapter(id), staleTime: 5 * 60_000 })),
  })

  const items = useMemo<Item[]>(() => {
    const list: Item[] = []
    if (today?.continue) {
      const c = today.continue
      const to = c.type === 'lesson' ? '/lessons/$lessonId' : c.type === 'exercise' ? '/exercises/$exerciseId' : '/chapters/$chapterId'
      const key = c.type === 'lesson' ? 'lessonId' : c.type === 'exercise' ? 'exerciseId' : 'chapterId'
      list.push({ key: 'action:continue', group: 'Actions', title: 'Continuer où j’en étais', hint: c.title, icon: ArrowRight, go: { to, params: { [key]: c.id } } })
    }
    list.push(
      { key: 'action:review', group: 'Actions', title: 'Révision du jour', hint: today?.review_due ? `${today.review_due} cartes` : undefined, icon: Brain, go: { to: '/review' } },
      { key: 'action:learn', group: 'Actions', title: 'Tableau de bord', icon: GraduationCap, go: { to: '/learn' } },
      { key: 'action:profile', group: 'Actions', title: 'Profil', hint: 'Trophées et classement', icon: UserRound, go: { to: '/profile' } },
      { key: 'action:settings', group: 'Actions', title: 'Paramètres', hint: 'Objectif, éditeur, sons', icon: Settings, go: { to: '/settings' } },
      { key: 'action:theme', group: 'Actions', title: 'Changer de thème', hint: 'Clair ou sombre', icon: Palette, go: { run: () => toggleTheme() } },
    )
    for (const c of courses ?? []) {
      list.push({ key: `course:${c.id}`, group: 'Cours', title: c.title, hint: c.book.title, icon: GraduationCap, go: { to: '/courses/$courseId', params: { courseId: c.id } } })
      for (const t of c.tracks)
        for (const ch of t.chapters)
          if (ch.available)
            list.push({ key: `chapter:${ch.id}`, group: 'Modules', title: ch.title, hint: c.title, icon: Layers, go: { to: '/chapters/$chapterId', params: { chapterId: ch.id } } })
    }
    const seen = new Set<string>()
    for (const q of chapters) {
      const ch = q.data
      if (!ch) continue
      for (const l of ch.lessons) {
        list.push({ key: `lesson:${l.id}`, group: 'Leçons', title: l.title, hint: ch.title, icon: BookOpen, go: { to: '/lessons/$lessonId', params: { lessonId: l.id } } })
        for (const x of l.labs) {
          seen.add(x.id)
          list.push({ key: `exercise:${x.id}`, group: 'Exercices', title: x.title, hint: ch.title, icon: FlaskConical, go: { to: '/exercises/$exerciseId', params: { exerciseId: x.id } } })
        }
      }
      for (const x of [ch.assignment, ch.boss, ch.project]) {
        if (!x || seen.has(x.id)) continue
        seen.add(x.id)
        list.push({ key: `exercise:${x.id}`, group: 'Exercices', title: x.title, hint: ch.title, icon: FlaskConical, go: { to: '/exercises/$exerciseId', params: { exerciseId: x.id } } })
      }
    }
    for (const x of sandbox ?? []) {
      if (seen.has(x.id)) continue
      list.push({ key: `exercise:${x.id}`, group: 'Exercices', title: x.title, hint: `Atelier · ${x.course.title}`, icon: FlaskConical, go: { to: '/exercises/$exerciseId', params: { exerciseId: x.id } } })
    }
    return list
  }, [courses, sandbox, today, chapters])

  // Requête vide : actions puis récents ; sinon résultats classés, groupés, limités par groupe.
  const results = useMemo<Item[]>(() => {
    const q = query.trim()
    if (!q) {
      const byKey = new Map(items.map((i) => [i.key, i]))
      const recent = readRecent()
        .map((k) => byKey.get(k))
        .filter((i): i is Item => !!i && i.group !== 'Actions')
        .map((i) => ({ ...i, group: 'Récents' as const, key: `recent:${i.key}` }))
      return [...items.filter((i) => i.group === 'Actions'), ...recent]
    }
    const scored = items
      .map((i) => ({ i, s: score(q, `${i.title} ${i.hint ?? ''}`) + score(q, i.title) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
    return GROUP_ORDER.flatMap((g) => scored.filter((x) => x.i.group === g).slice(0, MAX_PER_GROUP).map((x) => x.i))
  }, [items, query])

  useEffect(() => setActive(0), [query])
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const choose = (item: Item) => {
    pushRecent(item.key.replace(/^recent:/, ''))
    onClose()
    if ('run' in item.go) item.go.run()
    else navigate({ to: item.go.to, params: item.go.params } as never)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1))
    else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
    else if (e.key === 'Enter' && results[active]) choose(results[active])
    else return
    e.preventDefault()
  }

  const loading = chapterIds.length > 0 && chapters.some((q) => q.isPending)
  let index = -1

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-4 shrink-0 text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Cherche une leçon, un TP, un module…"
          aria-label="Rechercher"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={results[active] ? `palette-${active}` : undefined}
          className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 placeholder:text-muted"
        />
        <kbd className="rounded border border-line px-1.5 font-code text-[11px] text-muted">Échap</kbd>
      </div>

      <div ref={listRef} id="palette-list" role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
        {results.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-muted">
            {loading ? 'Chargement des leçons…' : `Rien pour « ${query} ». Essaie un autre mot.`}
          </p>
        ) : (
          GROUP_ORDER.concat('Récents').map((g) => {
            const inGroup = results.filter((r) => r.group === g)
            if (inGroup.length === 0) return null
            return (
              <div key={g} role="group" aria-label={g} className="mb-1">
                <p className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-xs font-medium text-muted">
                  {g === 'Récents' && <History className="size-3" />}
                  {g}
                </p>
                {inGroup.map((item) => {
                  index = results.indexOf(item)
                  const i = index
                  const on = i === active
                  return (
                    <div
                      key={item.key}
                      id={`palette-${i}`}
                      data-index={i}
                      role="option"
                      aria-selected={on}
                      onMouseMove={() => setActive(i)}
                      onClick={() => choose(item)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5',
                        on ? 'bg-accent/12 text-text' : 'text-text/90',
                      )}
                    >
                      <item.icon className={cn('size-4 shrink-0', on ? 'text-accent' : 'text-muted')} />
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                      {item.hint && <span className="hidden max-w-[45%] truncate text-xs text-muted sm:block">{item.hint}</span>}
                      {on && <CornerDownLeft className="size-3.5 shrink-0 text-accent" />}
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
      </div>

      <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-xs text-muted">
        <span>
          <kbd className="font-code">↑↓</kbd> naviguer
        </span>
        <span>
          <kbd className="font-code">Entrée</kbd> ouvrir
        </span>
        {loading && <span className="ml-auto">Chargement des leçons…</span>}
      </div>
    </>
  )
}
