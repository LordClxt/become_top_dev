import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { LevelTile } from '@/components/XpBar'
import { profileQuery } from '@/features/courses/queries'
import { api } from '@/lib/api'

const SIZE = 256
const MAX_SOURCE_BYTES = 15 * 1024 * 1024

/** Recadre au carré et réduit à 256 px : l'image envoyée pèse quelques Ko, quelle que soit la photo choisie. */
async function toSquareBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas indisponible')
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9))
  if (!blob) throw new Error('conversion impossible')
  return blob
}

export function AvatarEditor({ level }: { level: number }) {
  const qc = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const { data: profile } = useQuery(profileQuery)
  const refresh = () => qc.invalidateQueries({ queryKey: ['profile'] })

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_SOURCE_BYTES) throw new Error('Image trop lourde (15 Mo maximum).')
      await api.uploadAvatar(await toSquareBlob(file))
    },
    onSuccess: refresh,
  })
  const remove = useMutation({ mutationFn: api.removeAvatar, onSuccess: refresh })

  const version = profile?.avatar_version ?? null
  const busy = upload.isPending || remove.isPending
  const error = upload.error ?? remove.error

  return (
    <div className="shrink-0">
      <div className="relative size-36">
        {version ? (
          <img
            src={`/api/profile/avatar?v=${version}`}
            alt="Ta photo de profil"
            className="size-36 rounded-full border-2 border-accent object-cover"
          />
        ) : (
          <span className="grid size-36 place-items-center rounded-3xl border-2 border-dashed border-line bg-surface text-muted">
            <Camera className="size-9" />
          </span>
        )}
        <span className="absolute -right-1 -bottom-1 rounded-lg bg-ink p-0.5">
          <LevelTile level={level} size="sm" />
        </span>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="absolute inset-0 grid place-items-center rounded-3xl bg-ink/60 text-text opacity-0 transition-opacity duration-(--dur-fast) hover:opacity-100 focus-visible:opacity-100 disabled:opacity-100"
          aria-label={version ? 'Changer la photo de profil' : 'Ajouter une photo de profil'}
        >
          <Camera className="size-5" />
        </button>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) upload.mutate(file)
          }}
        />
      </div>
      {version && (
        <button
          type="button"
          onClick={() => remove.mutate()}
          disabled={busy}
          className="mt-3 inline-flex items-center gap-1 text-xs text-muted hover:text-text"
        >
          <Trash2 className="size-3" />
          Retirer
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 max-w-36 text-xs text-fail">
          {error instanceof Error ? error.message : 'Échec de l’envoi.'}
        </p>
      )}
    </div>
  )
}
