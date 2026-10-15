import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AuthForm, Field, PasswordMeter } from '@/features/auth/AuthForm'
import { meQuery } from '@/features/auth/queries'
import { api, ApiError } from '@/lib/api'

// Même règle que le backend (service.MinPasswordLen).
const MIN_PASSWORD = 10

type SignupSearch = { code?: string }

export const Route = createFileRoute('/signup')({
  validateSearch: (search: Record<string, unknown>): SignupSearch => ({
    code: typeof search.code === 'string' ? search.code : undefined,
  }),
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (me.authenticated) throw redirect({ to: '/learn' })
  },
  head: () => ({ meta: [{ title: 'Créer un compte · become_top_dev' }] }),
  component: Signup,
})

function Signup() {
  const search = Route.useSearch()
  const [code, setCode] = useState(search.code ?? '')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const qc = useQueryClient()

  const signup = useMutation({
    mutationFn: () => api.signup({ code, email, display_name: name, password }),
    onSuccess: async (me) => {
      qc.clear()
      qc.setQueryData(meQuery.queryKey, me)
      await navigate({ to: '/learn', replace: true })
    },
  })

  const err = signup.error instanceof ApiError ? signup.error : null
  const error = !signup.isError
    ? null
    : err && err.status >= 400 && err.status < 500
      ? err.status === 429
        ? 'Trop de tentatives. Réessaie plus tard.'
        : `${err.message.charAt(0).toUpperCase()}${err.message.slice(1)}.`
      : 'Le serveur ne répond pas. Réessaie dans un instant.'
  const edit = (set: (v: string) => void) => (v: string) => {
    set(v)
    if (signup.isError) signup.reset()
  }
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD
  const ready = code.trim() && name.trim() && email.trim() && password.length >= MIN_PASSWORD

  return (
    <AuthForm
      title="Rejoindre l'entraînement"
      intro="L'inscription se fait sur invitation. Entre le code reçu, puis choisis tes identifiants."
      error={error}
      submitLabel={signup.isPending ? 'Création…' : 'Créer mon compte'}
      canSubmit={!!ready && !signup.isPending}
      onSubmit={() => signup.mutate()}
      footer={
        <>
          Déjà un compte ?{' '}
          <Link to="/login" className="text-text underline underline-offset-4 hover:text-accent">
            Se connecter
          </Link>
        </>
      }
    >
      <Field
        label="Code d'invitation"
        autoComplete="off"
        autoFocus={!search.code}
        spellCheck={false}
        value={code}
        onValue={edit(setCode)}
        className="h-12 w-full rounded-md border border-line bg-surface px-3 font-code text-base tracking-widest uppercase outline-none transition-colors focus:border-accent aria-invalid:border-fail"
      />
      <Field
        label="Nom affiché"
        autoComplete="nickname"
        autoFocus={!!search.code}
        maxLength={40}
        value={name}
        onValue={edit(setName)}
      />
      <Field label="Email" type="email" autoComplete="email" value={email} onValue={edit(setEmail)} />
      <div>
        <Field
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          value={password}
          hint={`${MIN_PASSWORD} caractères minimum.`}
          onValue={edit(setPassword)}
        />
        <PasswordMeter length={password.length} min={MIN_PASSWORD} failed={tooShort && signup.isError} />
      </div>
    </AuthForm>
  )
}
