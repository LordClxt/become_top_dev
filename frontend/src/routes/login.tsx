import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { SliceMeter } from '@/components/SliceMeter'
import { Button } from '@/components/ui/button'
import { meQuery } from '@/features/auth/queries'
import { api, ApiError } from '@/lib/api'

type LoginSearch = { redirect?: string }

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    // Uniquement un chemin interne : jamais de redirection vers un autre domaine.
    redirect: typeof search.redirect === 'string' && search.redirect.startsWith('/') && !search.redirect.startsWith('//')
      ? search.redirect
      : undefined,
  }),
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (me.authenticated) throw redirect({ to: '/learn' })
  },
  head: () => ({ meta: [{ title: 'Connexion · become_top_dev' }] }),
  component: Login,
})

const CAP = 8

function Login() {
  const { redirect: next } = Route.useSearch()
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fieldId = useId()
  const errorId = useId()

  const login = useMutation({
    mutationFn: () => api.login(password),
    onSuccess: async () => {
      qc.setQueryData(meQuery.queryKey, { authenticated: true })
      await qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
      await navigate({ href: next ?? '/learn', replace: true })
    },
  })

  const wrong = login.error instanceof ApiError && login.error.status === 401
  const failed = login.isError

  return (
    <main className="relative isolate grid min-h-screen place-items-center overflow-hidden px-6 py-16">
      <form
        className="w-full max-w-sm"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (password) login.mutate()
        }}
      >
        <Link to="/" className="text-sm text-muted hover:text-text">
          become_top_dev
        </Link>
        <h1 className="mt-10 font-read text-4xl leading-tight font-semibold tracking-tight">Reprendre l'entraînement</h1>
        <p className="mt-3 mb-10 font-read text-lg leading-relaxed text-muted">
          Ton espace est privé. Entre ton mot de passe pour retrouver tes cours et ta progression.
        </p>

        <label htmlFor={fieldId} className="mb-2 block text-sm font-medium">
          Mot de passe
        </label>
        <input
          id={fieldId}
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          aria-invalid={failed || undefined}
          aria-describedby={failed ? errorId : undefined}
          onChange={(e) => {
            setPassword(e.target.value)
            if (login.isError) login.reset()
          }}
          className="h-12 w-full rounded-md border border-line bg-surface px-3 text-base outline-none transition-colors focus:border-accent aria-invalid:border-fail"
        />

        {/* La saisie remplit une slice : len = caractères tapés, cap = 8. Ambre si refusé. */}
        <SliceMeter
          len={Math.min(password.length, CAP)}
          cap={CAP}
          tone={failed ? 'fail' : 'accent'}
          label={`${password.length} caractères saisis`}
          className="mt-4"
        />

        <p id={errorId} role="alert" className="mt-3 min-h-5 text-sm text-fail">
          {failed &&
            (wrong
              ? 'Ce mot de passe ne correspond pas. Vérifie la saisie et réessaie.'
              : "Le serveur ne répond pas. Vérifie que le backend tourne, puis réessaie.")}
        </p>

        <Button type="submit" size="lg" className="mt-4 h-12 w-full text-base" disabled={!password || login.isPending}>
          {login.isPending ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
    </main>
  )
}
