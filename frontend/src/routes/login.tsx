import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AuthForm, Field, PasswordMeter } from '@/features/auth/AuthForm'
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

function Login() {
  const { redirect: next } = Route.useSearch()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const qc = useQueryClient()

  const login = useMutation({
    mutationFn: () => api.login(email, password),
    onSuccess: async (me) => {
      // Un autre compte a pu être connecté dans ce navigateur : rien de son cache ne doit rester.
      qc.clear()
      qc.setQueryData(meQuery.queryKey, me)
      await navigate({ href: next ?? '/learn', replace: true })
    },
  })

  const failed = login.isError
  const status = login.error instanceof ApiError ? login.error.status : 0
  const error = !failed
    ? null
    : status === 401
      ? 'Email ou mot de passe incorrect. Vérifie la saisie et réessaie.'
      : status === 429
        ? 'Trop de tentatives. Patiente quelques minutes avant de réessayer.'
        : 'Le serveur ne répond pas. Vérifie que le backend tourne, puis réessaie.'
  const edit = (set: (v: string) => void) => (v: string) => {
    set(v)
    if (login.isError) login.reset()
  }

  return (
    <AuthForm
      title="Reprendre l'entraînement"
      intro="Connecte-toi pour retrouver tes cours et ta progression."
      error={error}
      submitLabel={login.isPending ? 'Connexion…' : 'Se connecter'}
      canSubmit={!!email && !!password && !login.isPending}
      onSubmit={() => login.mutate()}
      footer={
        <>
          Pas encore de compte ?{' '}
          <Link to="/signup" className="text-text underline underline-offset-4 hover:text-accent">
            Créer un compte
          </Link>
        </>
      }
    >
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        autoFocus
        value={email}
        invalid={status === 401}
        onValue={edit(setEmail)}
      />
      <div>
        <Field
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          value={password}
          invalid={status === 401}
          onValue={edit(setPassword)}
        />
        <PasswordMeter length={password.length} failed={failed} />
      </div>
    </AuthForm>
  )
}
