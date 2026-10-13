import { createFileRoute } from '@tanstack/react-router'
import { type Settings, updateSettings, useSettings } from '@/lib/settings'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/settings')({
  head: () => ({ meta: [{ title: 'Paramètres · become_top_dev' }] }),
  component: SettingsPage,
})

function SettingsPage() {
  const settings = useSettings()
  return (
    <main className="mx-auto max-w-[760px] px-6 pt-14 pb-24">
      <h1 className="font-read text-4xl font-semibold tracking-tight">Paramètres</h1>
      <p className="mt-2 text-sm text-muted">Enregistrés dans ce navigateur.</p>

      <section className="mt-10" aria-labelledby="editor-title">
        <h2 id="editor-title" className="font-read text-2xl font-semibold">
          Éditeur de code
        </h2>
        <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
          <Toggle
            settings={settings}
            name="autocomplete"
            label="Autocomplétion"
            description="Propose les fonctions, méthodes et noms du TP pendant la frappe (Go, Groovy, Grails). Désactivée, Ctrl+Espace ne propose plus rien non plus."
          />
        </div>
      </section>
    </main>
  )
}

function Toggle({
  settings,
  name,
  label,
  description,
}: {
  settings: Settings
  name: keyof Settings
  label: string
  description: string
}) {
  const on = settings[name]
  const id = `setting-${name}`
  return (
    <div className="flex items-start justify-between gap-6 p-5">
      <div>
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => updateSettings({ [name]: !on })}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-line transition-colors duration-(--dur-fast)',
          on ? 'bg-accent' : 'bg-surface-2',
        )}
      >
        <span
          className={cn(
            'inline-block size-4 rounded-full shadow transition-transform duration-(--dur-fast)',
            on ? 'translate-x-6 bg-accent-ink' : 'translate-x-1 bg-muted',
          )}
        />
      </button>
    </div>
  )
}
