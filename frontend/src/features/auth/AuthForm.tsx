import { Link } from '@tanstack/react-router'
import type { ComponentProps, FormEvent, ReactNode } from 'react'
import { useId } from 'react'
import { SliceMeter } from '@/components/SliceMeter'
import { Button } from '@/components/ui/button'

/** Cadre commun des pages de connexion et d'inscription. */
export function AuthForm({
  title,
  intro,
  error,
  submitLabel,
  canSubmit,
  onSubmit,
  footer,
  children,
}: {
  title: string
  intro: string
  error: string | null
  submitLabel: string
  canSubmit: boolean
  onSubmit: () => void
  footer: ReactNode
  children: ReactNode
}) {
  return (
    <main className="relative isolate grid min-h-screen place-items-center overflow-hidden px-6 py-16">
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

      <form
        className="w-full max-w-sm"
        noValidate
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          if (canSubmit) onSubmit()
        }}
      >
        <Link to="/" className="text-sm text-muted hover:text-text">
          become_top_dev
        </Link>
        <h1 className="mt-10 font-read text-4xl leading-tight font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 mb-10 font-read text-lg leading-relaxed text-muted">{intro}</p>

        <div className="space-y-5">{children}</div>

        <p role="alert" className="mt-3 min-h-5 text-sm text-fail">
          {error}
        </p>

        <Button type="submit" size="lg" className="mt-4 h-12 w-full text-base" disabled={!canSubmit}>
          {submitLabel}
        </Button>

        <p className="mt-6 text-center text-sm text-muted">{footer}</p>
      </form>
    </main>
  )
}

type FieldProps = Omit<ComponentProps<'input'>, 'id' | 'onChange'> & {
  label: string
  hint?: string
  invalid?: boolean
  onValue: (value: string) => void
}

export function Field({ label, hint, invalid, onValue, ...input }: FieldProps) {
  const id = useId()
  const hintId = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={hint ? hintId : undefined}
        onChange={(e) => onValue(e.target.value)}
        className="h-12 w-full rounded-md border border-line bg-surface px-3 text-base outline-none transition-colors focus:border-accent aria-invalid:border-fail"
        {...input}
      />
      {hint && (
        <p id={hintId} className="mt-2 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}

const CAP = 8

/** La saisie remplit une slice : len = caractères tapés, cap = 8 (ou le minimum demandé). Ambre si refusé. */
export function PasswordMeter({ length, min = CAP, failed }: { length: number; min?: number; failed: boolean }) {
  return (
    <SliceMeter
      len={Math.min(length, min)}
      cap={min}
      tone={failed ? 'fail' : 'accent'}
      label={`${length} caractères saisis`}
      className="mt-3"
    />
  )
}
