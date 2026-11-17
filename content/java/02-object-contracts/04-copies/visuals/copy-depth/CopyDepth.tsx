import { useState } from 'react'

export const id = 'java-ch02-copy-depth'

// Modèle du tas : un Schedule possède une liste de créneaux ; chaque créneau est un objet mutable.
type Mode = 'shallow' | 'array' | 'deep'
type Slot = { id: number; text: string }
type Heap = {
  slots: Record<number, Slot>
  lists: Record<number, number[]> // liste id -> ids des créneaux
  objects: { name: string; list: number }[]
}

const MODES: { k: Mode; label: string; code: string; note: string }[] = [
  { k: 'shallow', label: 'super.clone() seul', code: 'return (Schedule) super.clone();', note: 'Le champ est recopié tel quel : la copie vise la même liste.' },
  { k: 'array', label: 'clone + nouvelle liste', code: 'result.slots = new ArrayList<>(slots);', note: 'Nouvelle liste, mais ses cases visent les mêmes créneaux.' },
  { k: 'deep', label: 'constructeur de copie profond', code: 'slots = other.slots.stream().map(Slot::new).toList();', note: 'Nouvelle liste ET nouveaux créneaux : plus rien de partagé.' },
]

function initial(): Heap {
  return {
    slots: { 1: { id: 1, text: 'lun : Léo' }, 2: { id: 2, text: 'mar : Zoé' } },
    lists: { 10: [1, 2] },
    objects: [{ name: 'current', list: 10 }],
  }
}

export default function CopyDepth() {
  const [mode, setMode] = useState<Mode>('shallow')
  const [heap, setHeap] = useState<Heap>(initial)
  const [log, setLog] = useState('Étape 1 : choisis une façon de copier, puis clique sur « copier ».')
  const copied = heap.objects.length > 1

  const reset = (m: Mode) => {
    setMode(m)
    setHeap(initial())
    setLog('Original remis à zéro. Clique sur « copier ».')
  }

  const copy = () => {
    if (copied) return
    const h: Heap = structuredClone(heap)
    const orig = h.objects[0]!
    if (mode === 'shallow') {
      h.objects.push({ name: 'draft', list: orig.list })
    } else if (mode === 'array') {
      h.lists[11] = [...h.lists[orig.list]!]
      h.objects.push({ name: 'draft', list: 11 })
    } else {
      h.lists[11] = h.lists[orig.list]!.map((sid) => {
        const nid = sid + 100
        h.slots[nid] = { id: nid, text: h.slots[sid]!.text }
        return nid
      })
      h.objects.push({ name: 'draft', list: 11 })
    }
    setHeap(h)
    setLog('Copie faite. Étape 2 : modifie le brouillon et regarde l’original.')
  }

  const editSlot = () => {
    if (!copied) return
    const h: Heap = structuredClone(heap)
    const sid = h.lists[h.objects[1]!.list]![0]!
    h.slots[sid]!.text = 'lun : Ana'
    setHeap(h)
    const shared = h.lists[h.objects[0]!.list]!.includes(sid)
    setLog(shared ? 'draft.slots.get(0).setWho("Ana") : le créneau est partagé, l’original affiche Ana aussi.' : 'Le créneau du brouillon est un objet à lui : l’original garde Léo.')
  }

  const addSlot = () => {
    if (!copied) return
    const h: Heap = structuredClone(heap)
    const lid = h.objects[1]!.list
    h.slots[50] = { id: 50, text: 'mer : Ana' }
    if (!h.lists[lid]!.includes(50)) h.lists[lid]!.push(50)
    setHeap(h)
    setLog(lid === h.objects[0]!.list ? 'draft.slots.add(…) : même liste, l’original a maintenant 3 créneaux.' : 'La liste du brouillon est à lui : l’original garde 2 créneaux.')
  }

  const current = MODES.find((m) => m.k === mode)!
  const listIds = Object.keys(heap.lists).map(Number)

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Façon de copier">
        {MODES.map((m) => (
          <button
            key={m.k}
            type="button"
            role="radio"
            aria-checked={mode === m.k}
            onClick={() => reset(m.k)}
            className={`rounded-md border px-3 py-1.5 text-xs ${mode === m.k ? 'border-accent text-text' : 'border-line text-muted hover:text-text'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="font-code text-xs text-muted break-words">{current.code}</p>

      <div className="flex flex-wrap gap-2 text-sm">
        <button type="button" onClick={copy} disabled={copied} className="rounded-md border border-line px-3 py-1.5 hover:border-accent disabled:opacity-40">
          copier : draft = copie(current)
        </button>
        <button type="button" onClick={editSlot} disabled={!copied} className="rounded-md border border-line px-3 py-1.5 hover:border-accent disabled:opacity-40">
          modifier un créneau du brouillon
        </button>
        <button type="button" onClick={addSlot} disabled={!copied} className="rounded-md border border-line px-3 py-1.5 hover:border-accent disabled:opacity-40">
          ajouter un créneau au brouillon
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[auto_1fr]" aria-label="Tas">
        <div className="grid content-start gap-2">
          {heap.objects.map((o) => (
            <div key={o.name} className="rounded-xl border border-line bg-surface px-3 py-2 font-code text-xs">
              <span className={o.name === 'current' ? 'text-accent' : 'text-text'}>{o.name}</span>
              <span className="text-muted"> .slots → liste #{o.list}</span>
            </div>
          ))}
        </div>
        <div className="grid gap-2">
          {listIds.map((lid) => {
            const owners = heap.objects.filter((o) => o.list === lid).map((o) => o.name)
            return (
              <div key={lid} className={`rounded-xl border px-3 py-2 ${owners.length > 1 ? 'border-fail/70' : 'border-line'}`}>
                <div className="mb-1 font-code text-[11px] text-muted">
                  liste #{lid} ← {owners.join(' et ')} {owners.length > 1 && <span className="text-fail">(partagée)</span>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {heap.lists[lid]!.map((sid) => {
                    const users = listIds.filter((l) => heap.lists[l]!.includes(sid)).length
                    return (
                      <span key={sid} className={`rounded border px-2 py-0.5 font-code text-xs ${users > 1 ? 'border-fail/60 bg-fail/10' : 'border-line bg-cell-empty'}`}>
                        créneau #{sid} {heap.slots[sid]!.text}
                        {users > 1 && <span className="text-fail"> (partagé)</span>}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-muted">{current.note}</p>
      <p role="status" className="text-sm">{log}</p>
    </div>
  )
}
