import { highlightGo } from '@/lib/highlight'

export function CodeBlock({ code, language = 'go' }: { code: string; language?: string }) {
  const trimmed = code.replace(/\n$/, '')
  return (
    <pre className="code-block">
      <code>{language === 'go' ? highlightGo(trimmed) : trimmed}</code>
    </pre>
  )
}
