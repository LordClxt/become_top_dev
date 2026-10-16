import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

/** Liste des membres et leur XP. Réservé à l'admin. */
export function MembersPanel() {
  const members = useQuery({ queryKey: ['admin', 'members'], queryFn: api.members })

  return (
    <div className="rounded-2xl border border-line bg-surface">
      {members.isPending ? (
        <p className="p-5 text-sm text-muted">Chargement…</p>
      ) : members.isError ? (
        <p className="p-5 text-sm text-fail">Impossible de charger les membres.</p>
      ) : members.data.length === 0 ? (
        <p className="p-5 text-sm text-muted">Aucun membre pour l'instant.</p>
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
  )
}

export const InvitesPanel = MembersPanel
