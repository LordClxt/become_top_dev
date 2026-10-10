import { useState } from 'react'

export const id = 'go-ch05-stack-heap'

type Snippet = {
  title: string
  code: string
  heap: boolean
  why: string
  compiler: string
}

const SNIPPETS: Snippet[] = [
  {
    title: 'Pointeur local',
    code: 'func twice() int {\n\tx := 21\n\tp := &x\n\treturn *p * 2\n}',
    heap: false,
    why: 'Le pointeur p ne quitte jamais la fonction : le compilateur peut prouver que x n’a pas besoin de survivre à l’appel.',
    compiler: '(aucun message : x ne s’échappe pas)',
  },
  {
    title: 'Pointeur renvoyé',
    code: 'func newPerson() *Person {\n\tp := Person{Name: "Ada"}\n\treturn &p\n}',
    heap: true,
    why: 'La fonction renvoie l’adresse de p. Après le return, le cadre de pile disparaît : p doit vivre ailleurs, sur le tas.',
    compiler: './main.go:5:2: moved to heap: p',
  },
  {
    title: 'Taille inconnue',
    code: 'func fill(n int) []int {\n\ts := make([]int, n)\n\tfor i := range s {\n\t\ts[i] = i\n\t}\n\treturn s\n}',
    heap: true,
    why: 'La taille n’est connue qu’à l’exécution, et la slice est renvoyée. Il est impossible de réserver la place sur la pile à l’avance.',
    compiler: './main.go:3:11: make([]int, n) escapes to heap',
  },
  {
    title: 'Petite taille fixe',
    code: 'func total() int {\n\ts := make([]int, 8)\n\tfor i := range s {\n\t\ts[i] = i\n\t}\n\tsum := 0\n\tfor _, v := range s {\n\t\tsum += v\n\t}\n\treturn sum\n}',
    heap: false,
    why: 'La taille (8) est connue à la compilation et la slice reste locale : le tableau peut vivre sur la pile.',
    compiler: './main.go:3:11: make([]int, 8) does not escape',
  },
  {
    title: 'Rangé dans une variable de package',
    code: 'var last *int\n\nfunc remember() {\n\tx := 42\n\tlast = &x\n}',
    heap: true,
    why: 'last est lue après la fin de remember : x doit survivre à l’appel, donc elle est allouée sur le tas.',
    compiler: './main.go:6:2: moved to heap: x',
  },
  {
    title: 'Capturée par une closure renvoyée',
    code: 'func counter() func() int {\n\tn := 0\n\treturn func() int {\n\t\tn++\n\t\treturn n\n\t}\n}',
    heap: true,
    why: 'La closure renvoyée utilise n bien après la sortie de counter. La variable capturée est donc déplacée sur le tas.',
    compiler: './main.go:3:2: moved to heap: n',
  },
]

export default function StackHeap() {
  const [selected, setSelected] = useState(1)
  const s = SNIPPETS[selected]!

  return (
    <div className="grid gap-4">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Extraits de code">
        {SNIPPETS.map((snippet, i) => (
          <button
            key={snippet.title}
            type="button"
            role="tab"
            aria-selected={i === selected}
            onClick={() => setSelected(i)}
            className={`shrink-0 rounded-md border px-3 py-1.5 text-sm whitespace-nowrap ${
              i === selected ? 'border-accent text-text' : 'border-line text-muted hover:text-text'
            }`}
          >
            {snippet.title}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <pre className="overflow-x-auto rounded-md border border-line bg-ink/60 p-3 font-code text-xs leading-6 [tab-size:4]" aria-label="Code">
          {s.code}
        </pre>

        <div className="grid content-start gap-3 text-sm">
          <div className="grid grid-cols-2 gap-2 text-center text-xs" aria-hidden="true">
            <div className={`rounded-md border px-3 py-4 ${!s.heap ? 'border-pass bg-pass/10 text-text' : 'border-line text-muted'}`}>
              Pile
              <div className="mt-1 text-[11px]">rapide, sans GC</div>
            </div>
            <div className={`rounded-md border px-3 py-4 ${s.heap ? 'border-fail bg-fail/10 text-text' : 'border-line text-muted'}`}>
              Tas
              <div className="mt-1 text-[11px]">géré par le GC</div>
            </div>
          </div>
          <p role="status">
            <strong className={s.heap ? 'text-fail' : 'text-pass'}>{s.heap ? 'Elle s’échappe vers le tas.' : 'Elle reste sur la pile.'}</strong> {s.why}
          </p>
          <p className="font-code text-xs text-muted">
            go build -gcflags=-m
            <br />
            {s.compiler}
          </p>
          <p className="text-xs text-muted">Les messages exacts varient selon la version du compilateur.</p>
        </div>
      </div>
    </div>
  )
}
