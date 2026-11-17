import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { FlaskConical, GraduationCap, LogOut, Moon, Settings, Sun, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { HeaderXpCluster } from '@/components/celebrate/HeaderXpCluster'
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
