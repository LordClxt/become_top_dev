import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Eye, FlaskConical, GraduationCap, Layers, LogOut, Moon, Search, Settings, Sun, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { HeaderXpCluster } from '@/components/celebrate/HeaderXpCluster'
import { progressQuery } from '@/features/courses/queries'
import { Ring } from '@/features/habit/GoalRing'
import { continueLink, continuePath, todayQuery } from '@/features/habit/queries'
import { isWorkPath, setFocus, useFocusActive } from '@/features/session/focus'
import { SessionPill } from '@/features/session/SessionUI'
import { api } from '@/lib/api'
import { toggleTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/learn', label: "Aujourd'hui", icon: GraduationCap },
  { to: '/review', label: 'Révision', icon: Layers },
  { to: '/sandbox', label: 'Atelier', icon: FlaskConical },
  { to: '/profile', label: 'Profil', icon: UserRound },
] as const

export function AppHeader() {
  const focus = useFocusActive()
  return focus ? <FocusHeader /> : <FullHeader />
}

/**
 * En-tête du mode concentration : même hauteur que l'en-tête complet (les pages de TP en dépendent),
 * sans XP, série, objectif, « Continuer » ni recherche. Il reste la marque, le minuteur et la sortie.
 */
function FocusHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 md:px-6">
        <Link to="/learn" className="flex items-center gap-2.5 text-sm text-muted hover:text-text" aria-label="Quitter vers Aujourd'hui">
          <BrandMark />
          <span className="font-code text-[11px] font-semibold tracking-[0.14em] uppercase">Concentration</span>
        </Link>
        <div className="flex items-center gap-2">
          <SessionPill />
          <button
            type="button"
            onClick={() => setFocus(false)}
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors duration-(--dur-fast) hover:bg-surface-2 hover:text-text"
            title="Quitter le mode concentration (F)"
          >
            Quitter <kbd className="habit-kbd hidden md:inline">F</kbd>
          </button>
        </div>
      </div>
    </header>
  )
}

function FullHeader() {
  const { data: progress } = useQuery(progressQuery)
  const { data: today } = useQuery(todayQuery)
  const pathname = useLocation({ select: (l) => l.pathname })
  const next = today?.continue
  const showContinue = !!next && pathname !== '/learn' && pathname !== continuePath(next)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: async () => {
      qc.clear()
      await navigate({ to: '/' })
    },
  })
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  useEffect(() => {
    setTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark')
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 md:gap-6 md:px-6">
        <nav className="flex items-center gap-1" aria-label="Navigation principale">
          <Link
            to="/learn"
            className="flex items-center gap-2 font-read text-lg font-semibold tracking-tight md:mr-5"
            aria-label="become_top_dev, mes cours"
          >
            <BrandMark />
            <span className="hidden sm:inline md:hidden xl:inline">become_top_dev</span>
          </Link>
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors duration-(--dur-fast) hover:bg-surface-2 hover:text-text md:flex lg:px-3"
              activeProps={{ className: 'bg-surface-2 text-text', 'aria-current': 'page' }}
              title={item.label}
            >
              {/* Entre tablette et petit bureau : icônes seules, pour que l'en-tête tienne sur une ligne. */}
              <item.icon className="size-4 lg:hidden" aria-hidden="true" />
              <span className="sr-only lg:not-sr-only">{item.label}</span>
              {item.to === '/review' && <DueBadge n={today?.review_due ?? 0} />}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 text-sm md:gap-2">
          <SessionPill />
          {isWorkPath(pathname) && (
            <button
              type="button"
              onClick={() => setFocus(true)}
              className="flex items-center gap-1.5 rounded-md p-2 text-muted transition-colors duration-(--dur-fast) hover:bg-surface-2 hover:text-text"
              aria-label="Mode concentration"
              title="Mode concentration (F) : masque XP, série et annonces"
            >
              <Eye className="size-4" />
              <kbd className="hidden rounded border border-line px-1.5 font-code text-[10px] leading-4 xl:inline">F</kbd>
            </button>
          )}
          {showContinue && (
            <Link
              {...continueLink(next)}
              className="mr-1 hidden items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink transition-opacity duration-(--dur-fast) hover:opacity-90 xl:flex"
              title={`${next.label} : ${next.title}`}
            >
              Continuer <ArrowRight className="size-3.5" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('btd:palette'))}
            className="flex items-center gap-2 rounded-md p-2 text-muted transition-colors duration-(--dur-fast) hover:bg-surface-2 hover:text-text xl:border xl:border-line xl:py-1.5 xl:pr-1.5 xl:pl-2.5"
            aria-label="Rechercher"
            title="Rechercher (⌘K)"
          >
            <Search className="size-4" />
            <kbd className="hidden rounded border border-line px-1.5 font-code text-[10px] leading-4 xl:inline">⌘K</kbd>
          </button>
          {today && (
            <Link
              to="/learn"
              className="group relative rounded-md p-1.5 transition-colors duration-(--dur-fast) hover:bg-surface-2"
              aria-label={`Objectif du jour : ${today.xp_today} sur ${today.goal_xp} XP`}
            >
              <Ring have={today.xp_today} goal={today.goal_xp} size={24} stroke={3.5} />
              <span
                className="juice-tip pointer-events-none absolute top-full right-0 z-50 mt-2 w-max rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg"
                aria-hidden="true"
              >
                <span className="font-code tabular-nums">
                  {today.xp_today} / {today.goal_xp} XP
                </span>{' '}
                aujourd'hui{today.goal_met ? ', objectif atteint' : ''}
              </span>
            </Link>
          )}
          {progress && <HeaderXpCluster progress={progress} />}
          <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setTheme(toggleTheme())}
            className="rounded-md p-2 text-muted transition-colors duration-(--dur-fast) hover:bg-surface-2 hover:text-text"
            aria-label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <Link
            to="/settings"
            className="rounded-md p-2 text-muted transition-colors duration-(--dur-fast) hover:bg-surface-2 hover:text-text"
            activeProps={{ className: 'bg-surface-2 text-text', 'aria-current': 'page' }}
            aria-label="Paramètres"
            title="Paramètres"
          >
            <Settings className="size-4" />
          </Link>
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="rounded-md p-2 text-muted transition-colors duration-(--dur-fast) hover:bg-surface-2 hover:text-text"
            aria-label="Se déconnecter"
            title="Se déconnecter"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  )
}

/** Sur téléphone, la navigation principale passe dans une barre d'onglets en bas de l'écran, à portée de pouce. */
export function MobileTabBar() {
  const { data: today } = useQuery(todayQuery)
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Navigation principale"
    >
      {NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted"
          activeProps={{ className: 'text-accent', 'aria-current': 'page' }}
        >
          <span className="relative">
            <Icon className="size-5" aria-hidden="true" />
            {to === '/review' && <DueBadge n={today?.review_due ?? 0} floating />}
          </span>
          {label}
        </Link>
      ))}
    </nav>
  )
}

/** La marque : une slice len=2 cap=3, trois cases dont deux remplies. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('flex gap-[2px]', className)} aria-hidden="true">
      <span className="size-2 rounded-[2px] bg-accent" />
      <span className="size-2 rounded-[2px] bg-accent" />
      <span className="size-2 rounded-[2px] bg-cell-empty" />
    </span>
  )
}

/** Pastille du nombre de cartes à réviser (rien quand il n'y en a pas). */
function DueBadge({ n, floating }: { n: number; floating?: boolean }) {
  if (n <= 0) return null
  return (
    <span
      className={cn(
        'grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-code text-[10px] leading-none font-semibold text-accent-ink tabular-nums',
        floating && 'absolute -top-1.5 -right-2.5',
      )}
      aria-label={`${n} à réviser`}
    >
      {n > 99 ? '99+' : n}
    </span>
  )
}
