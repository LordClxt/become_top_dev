import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { api, type Invite } from '@/lib/api'
import { cn } from '@/lib/utils'

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

/** XXXXXXXXXXXX → XXXX-XXXX-XXXX : plus facile à dicter ou recopier. */
const pretty = (code: string) => code.match(/.{1,4}/g)?.join('-') ?? code

const STATUS: Record<Invite['status'], string> = {
  pending: 'En attente',
  used: 'Utilisée',
  expired: 'Expirée',
}

/** Invitations (création, lien à copier, révocation) et liste des membres. Réservé à l'admin. */
export function InvitesPanel() {
  const qc = useQueryClient()
  const invites = useQuery({ queryKey: ['admin', 'invites'], queryFn: api.invites })
  const members = useQuery({ queryKey: ['admin', 'members'], queryFn: api.members })
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'invites'] })
  const create = useMutation({ mutationFn: api.createInvite, onSuccess: refresh })
  const revoke = useMutation({ mutationFn: api.revokeInvite, onSuccess: refresh })

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="max-w-[46ch] text-sm text-muted">
            Chaque code sert une seule fois et expire au bout de 7 jours. Partage le lien : le code y est déjà rempli.
          </p>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus className="size-4" aria-hidden="true" />
            Nouvelle invitation
          </Button>
        </div>
        {create.isError && <p className="px-5 pb-4 text-sm text-fail">La création a échoué. Réessaie.</p>}

        {invites.isPending ? (
          <p className="border-t border-line p-5 text-sm text-muted">Chargement…</p>
        ) : invites.isError ? (
          <p className="border-t border-line p-5 text-sm text-fail">Impossible de charger les invitations.</p>
        ) : invites.data.length === 0 ? (
          <p className="border-t border-line p-5 text-sm text-muted">Aucune invitation pour l'instant.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {invites.data.map((inv) => (
              <InviteRow
                key={inv.code}
                invite={inv}
                onRevoke={() => revoke.mutate(inv.code)}
                revoking={revoke.isPending && revoke.variables === inv.code}
              />
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-3 font-medium">Membres</h3>
        <div className="rounded-2xl border border-line bg-surface">
          {members.isPending ? (
            <p className="p-5 text-sm text-muted">Chargement…</p>
          ) : members.isError ? (
            <p className="p-5 text-sm text-fail">Impossible de charger les membres.</p>
          ) : (
            <ul className="divide-y divide-line">
              {members.data.map((m) => (
                <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 p-5 text-sm">
                  <span>
                    <span className="font-medium">{m.display_name}</span>
                    {m.is_admin && <span className="ml-2 text-xs text-accent">admin</span>}
                    <span className="block text-muted break-all">{m.email}</span>
                  </span>
                  <span className="text-muted">
                    <span className="font-code tabular-nums text-text">{m.xp} XP</span> · depuis le{' '}
                    {dateFmt.format(new Date(m.created_at))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function InviteRow({ invite, onRevoke, revoking }: { invite: Invite; onRevoke: () => void; revoking: boolean }) {
  const [copied, setCopied] = useState(false)
  const pending = invite.status === 'pending'
  const link = typeof window === 'undefined' ? '' : `${window.location.origin}/signup?code=${invite.code}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Presse-papiers refusé (contexte non sécurisé) : le code reste lisible à l'écran.
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div>
        <span className={cn('font-code tracking-widest', !pending && 'text-muted line-through')}>{pretty(invite.code)}</span>
        <p className="mt-1 text-xs text-muted">
          <span className={cn(pending && 'text-accent')}>{STATUS[invite.status]}</span>
          {' · '}
          {invite.status === 'used'
            ? `par ${invite.used_by ?? 'un compte supprimé'}${invite.used_at ? `, le ${dateFmt.format(new Date(invite.used_at))}` : ''}`
            : `expire le ${dateFmt.format(new Date(invite.expires_at))}`}
        </p>
      </div>
      {pending && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? 'Lien copié' : 'Copier le lien'}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onRevoke} disabled={revoking} aria-label={`Révoquer ${pretty(invite.code)}`}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </li>
  )
}
