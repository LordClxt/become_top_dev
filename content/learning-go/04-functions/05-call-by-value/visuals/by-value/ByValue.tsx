import { useState } from 'react'

export const id = 'go-ch04-by-value'

type Case = {
  kind: string
  action: string
  visible: boolean
  code: string
  why: string
}

const CASES: Case[] = [
  {
    kind: 'int, string, bool…',
    action: 'réaffecter le paramètre',
    visible: false,
    code: 'func f(n int) { n = n * 2 }\n\nn := 2\nf(n)           // n vaut toujours 2',
    why: 'Le paramètre est une copie de la valeur : la fonction double sa propre copie.',
  },
  {
    kind: 'struct',
    action: 'modifier un champ',
    visible: false,
    code: 'func f(p Person) { p.Name = "Bob" }\n\np := Person{}\nf(p)           // p.Name vaut toujours ""',
    why: 'Toute la struct est copiée. Pour la modifier, la fonction doit renvoyer la nouvelle struct (ou recevoir un pointeur).',
  },
  {
    kind: 'map',
    action: 'ajouter, modifier ou supprimer une clé',
    visible: true,
    code: 'func f(m map[int]string) { m[2] = "hello"; delete(m, 1) }\n\nm := map[int]string{1: "a"}\nf(m)           // m == map[2:hello]',
    why: 'La valeur copiée est un descripteur qui pointe vers la même table de données : les deux variables partagent le contenu.',
  },
  {
    kind: 'slice',
    action: 'modifier un élément',
    visible: true,
    code: 'func f(s []int) { s[0] = 100 }\n\ns := []int{1, 2}\nf(s)           // s == [100 2]',
    why: 'L’en-tête copié pointe vers le même tableau d’éléments : écrire un élément se voit chez l’appelant.',
  },
  {
    kind: 'slice',
    action: 'agrandir avec append',
    visible: false,
    code: 'func f(s []int) { s = append(s, 10) }\n\ns := []int{1, 2, 3}\nf(s)           // len(s) vaut toujours 3',
    why: 'La longueur vit dans l’en-tête, qui est copié. L’append change la copie. Pour que l’appelant voie la nouvelle slice, il faut la renvoyer : s = grow(s).',
  },
  {
    kind: 'struct qui contient une slice',
    action: 'modifier un élément du champ',
    visible: true,
    code: 'type box struct{ items []int }\nfunc f(b box) { b.items[0] = 100 }\n\nb := box{items: []int{1, 2}}\nf(b)           // b.items == [100 2]',
    why: 'La struct est copiée, mais son champ est un en-tête de slice qui pointe vers le même tableau.',
  },
  {
    kind: 'struct qui contient une slice',
    action: 'ajouter un élément au champ',
    visible: false,
    code: 'func f(b box) { b.items = append(b.items, 3) }\n\nb := box{items: []int{1, 2}}\nf(b)           // len(b.items) vaut toujours 2',
    why: 'Réaffecter b.items modifie le champ de la copie de la struct, pas celui de l’appelant.',
  },
  {
    kind: 'pointeur (aperçu du prochain module)',
    action: 'modifier la cible',
    visible: true,
    code: 'func f(p *int) { *p = 100 }\n\nn := 1\nf(&n)          // n == 100',
    why: 'On copie encore une valeur, mais cette valeur est l’adresse de n : elle désigne la variable d’origine.',
  },
]

export default function ByValue() {
  const [selected, setSelected] = useState(4)
  const c = CASES[selected]!

  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-sm">
          <caption className="sr-only">Ce que l’appelant voit après l’appel d’une fonction</caption>
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="p-2 font-normal">type du paramètre</th>
              <th className="p-2 font-normal">ce que fait la fonction</th>
              <th className="p-2 font-normal">l’appelant le voit ?</th>
            </tr>
          </thead>
          <tbody>
            {CASES.map((row, i) => (
              <tr key={i} className={`border-t border-line ${i === selected ? 'bg-accent/10' : ''}`}>
                <td className="p-0">
                  <button type="button" onClick={() => setSelected(i)} className="w-full p-2 text-left" aria-pressed={i === selected}>
                    {row.kind}
                  </button>
                </td>
                <td className="p-2 text-muted">{row.action}</td>
                <td className={`p-2 font-semibold ${row.visible ? 'text-pass' : 'text-fail'}`}>{row.visible ? 'oui' : 'non'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-2 rounded-md border border-line bg-ink/40 p-4">
        <pre className="overflow-x-auto font-code text-xs leading-6 [tab-size:4]">{c.code}</pre>
        <p className="text-sm" role="status">
          <strong className={c.visible ? 'text-pass' : 'text-fail'}>{c.visible ? 'Visible' : 'Invisible'}.</strong> {c.why}
        </p>
      </div>
    </div>
  )
}
