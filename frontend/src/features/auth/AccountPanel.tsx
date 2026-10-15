import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/features/auth/AuthForm'
import { meQuery } from '@/features/auth/queries'
import { api, ApiError } from '@/lib/api'

const MIN_PASSWORD = 10

/** Identité du compte et changement de mot de passe (ferme les autres sessions). */
export function AccountPanel() {
  const { data: me } = useQuery(meQuery)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')

  const change = useMutation({
    mutationFn: () => api.changePassword(current, next),
    onSuccess: () => {
      setCurrent('')
      setNext('')
    },
  })
  const edit = (set: (v: string) => void) => (v: string) => {
    set(v)
    if (!change.isIdle) change.reset()
  }
  const error =
    change.error instanceof ApiError && change.error.status === 400
      ? `${change.error.message.charAt(0).toUpperCase()}${change.error.message.slice(1)}.`
      : change.isError
        ? 'Le serveur ne répond pas. Réessaie dans un instant.'
        : null

  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
      <dl className="grid grid-cols-[8rem_1fr] gap-y-2 p-5 text-sm">
        <dt className="text-muted">Nom affiché</dt>
        <dd className="font-medium">{me?.user?.display_name}</dd>
        <dt className="text-muted">Email</dt>
        <dd className="font-medium break-all">{me?.user?.email}</dd>
      </dl>
      <form
        className="space-y-4 p-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (current && next.length >= MIN_PASSWORD) change.mutate()
        }}
      >
        <h3 className="font-medium">Changer le mot de passe</h3>
        <Field
          label="Mot de passe actuel"
          type="password"
          autoComplete="current-password"
          value={current}
          onValue={edit(setCurrent)}
        />
        <Field
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          hint={`${MIN_PASSWORD} caractères minimum. Tes autres appareils seront déconnectés.`}
          value={next}
          onValue={edit(setNext)}
        />
        <p role="status" className="min-h-5 text-sm">
          {error && <span className="text-fail">{error}</span>}
          {change.isSuccess && <span className="text-pass">Mot de passe changé.</span>}
        </p>
        <Button type="submit" disabled={!current || next.length < MIN_PASSWORD || change.isPending}>
          {change.isPending ? 'Enregistrement…' : 'Changer le mot de passe'}
        </Button>
      </form>
    </div>
  )
}
