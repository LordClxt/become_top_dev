import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { FlaskConical, GraduationCap, LogOut, Moon, Settings, Sun, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { StreakFlame } from '@/components/StreakFlame'
import { LevelTile, XpBar } from '@/components/XpBar'
import { progressQuery } from '@/features/courses/queries'
import { api } from '@/lib/api'
import { toggleTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/learn', label: 'Mes cours', icon: GraduationCap },
  { to: '/sandbox', label: 'Atelier', icon: FlaskConical },
  { to: '/profile', label: 'Profil', icon: UserRound },
] as const

export function AppHeader() {
  const { data: progress } = useQuery(progressQuery)
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

  const toNext = progress ? progress.next_level_xp - progress.xp : 0
  const streak = progress?.streak_days ?? 0

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
            <span className="hidden sm:inline md:hidden lg:inline">become_top_dev</span>
          </Link>
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="hidden rounded-md px-3 py-1.5 text-sm text-muted transition-colors duration-(--dur-fast) hover:bg-surface-2 hover:text-text md:block"
              activeProps={{ className: 'bg-surface-2 text-text', 'aria-current': 'page' }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 text-sm md:gap-2">
          {progress && (
            <>
              <Link
                to="/profile"
                className="flex items-center gap-3 rounded-lg py-1 pr-3 pl-1 transition-colors duration-(--dur-fast) hover:bg-surface-2"
                title={`${progress.xp} XP au total. Encore ${toNext} XP avant le niveau ${progress.level + 1}.`}
              >
                <LevelTile level={progress.level} size="sm" />
                <span className="hidden flex-col gap-1 md:flex">
                  <XpBar progress={progress} size="sm" />
                  <span className="font-code text-[11px] leading-none text-muted tabular-nums">
                    {progress.xp - progress.level_floor_xp}/{progress.next_level_xp - progress.level_floor_xp} XP
                  </span>
                </span>
                <span className="sr-only">Niveau {progress.level}</span>
              </Link>
              <Link
                to="/profile"
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors duration-(--dur-fast) hover:bg-surface-2',
                  streak > 0 ? 'text-text' : 'text-muted',
                )}
                title={
                  streak > 0
                    ? `${streak} jour${streak > 1 ? 's' : ''} d’affilée avec au moins une activité`
                    : 'Aucune série en cours : une leçon, un TP ou un quiz aujourd’hui la démarre'
                }
              >
                <StreakFlame lit={streak > 0} />
                <span className="font-medium tabular-nums">{streak}</span>
                <span className="sr-only">{streak > 1 ? 'jours de série' : 'jour de série'}</span>
              </Link>
            </>
          )}
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
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Navigation principale"
    >
      {NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted"
          activeProps={{ className: 'text-accent', 'aria-current': 'page' }}
        >
          <Icon className="size-5" aria-hidden="true" />
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
