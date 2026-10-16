import { snippetCompletion, type Completion, type CompletionContext, type CompletionSource } from '@codemirror/autocomplete'
import { inCommentOrString, result, typescriptWorkspaceNames, wordsInDoc } from './workspace'

const list = (names: string, type: string, detail?: string): Completion[] =>
  names
    .split(/\s+/)
    .filter(Boolean)
    .map((label) => ({ label, type, detail }))

const KEYWORDS = list(
  'abstract any as asserts async await bigint boolean break case catch class const continue declare default delete do else enum export extends false finally for from function get if implements import in infer instanceof interface is keyof let never new null number object of readonly return satisfies set static string super switch symbol this throw true try type typeof undefined unique unknown void while yield',
  'keyword',
)

const SNIPPETS: Completion[] = [
  snippetCompletion('function ${name}(${params}): ${Type} {\n\t${}\n}', { label: 'function', detail: 'fonction', type: 'keyword' }),
  snippetCompletion('export function ${name}(${params}): ${Type} {\n\t${}\n}', { label: 'export', detail: 'fonction exportée', type: 'keyword' }),
  snippetCompletion('interface ${Name} {\n\t${}\n}', { label: 'interface', detail: 'interface', type: 'keyword' }),
  snippetCompletion('type ${Name} = ${};', { label: 'type', detail: 'alias', type: 'keyword' }),
  snippetCompletion('for (const ${item} of ${items}) {\n\t${}\n}', { label: 'for', detail: 'for-of', type: 'keyword' }),
  snippetCompletion('if (${}) {\n\t${}\n}', { label: 'if', detail: 'bloc', type: 'keyword' }),
  snippetCompletion('switch (${value}) {\n\tcase ${x}:\n\t\t${}\n\t\tbreak;\n\tdefault:\n\t\t${}\n}', { label: 'switch', detail: 'bloc', type: 'keyword' }),
  snippetCompletion('try {\n\t${}\n} catch (e) {\n\t${}\n}', { label: 'try', detail: '/ catch', type: 'keyword' }),
  snippetCompletion('(${params}) => ${}', { label: '=>', detail: 'fonction fléchée', type: 'keyword' }),
  snippetCompletion("throw new Error(`${}`);", { label: 'throw', detail: 'lever', type: 'keyword' }),
  snippetCompletion('console.log(${});', { label: 'log', detail: 'afficher', type: 'function' }),
]

const GLOBALS = list(
  'Array ReadonlyArray Map ReadonlyMap Set WeakMap Object String Number Boolean BigInt Symbol Math JSON Date RegExp Error TypeError RangeError Promise Iterable Iterator Generator AsyncIterable Uint8Array ArrayBuffer DataView TextEncoder TextDecoder console structuredClone setTimeout clearTimeout queueMicrotask Partial Required Readonly Pick Omit Record Exclude Extract NonNullable ReturnType Parameters Awaited InstanceType Uppercase Lowercase Capitalize Uncapitalize PropertyKey NoInfer',
  'class',
)

/** Méthodes courantes de la bibliothèque standard (pas d'inférence de type : liste à plat). */
const MEMBERS = list(
  'length push pop shift unshift slice splice concat join reverse sort toSorted toReversed toSpliced with indexOf lastIndexOf includes find findIndex findLast findLastIndex filter map flatMap flat reduce reduceRight forEach some every keys values entries at fill get set has delete clear size add then catch finally toString toFixed padStart padEnd trim trimStart trimEnd split startsWith endsWith replace replaceAll repeat charAt charCodeAt codePointAt toUpperCase toLowerCase localeCompare match matchAll test exec getTime toISOString assign freeze fromEntries groupBy parse stringify floor ceil round max min abs sqrt pow random all allSettled race resolve reject from isArray isInteger isNaN',
  'method',
  'stdlib',
)

/** Complétion TypeScript : mots-clés, snippets, bibliothèque standard et noms déclarés dans les fichiers du TP. */
export function typescriptCompletion(otherFiles: string[]): CompletionSource {
  return (context: CompletionContext) => {
    if (inCommentOrString(context)) return null
    const ws = typescriptWorkspaceNames([context.state.doc.toString(), ...otherFiles])

    const member = context.matchBefore(/(\w+|[)\]}"'`])\s*\??\.\w*$/)
    if (member) {
      const recv = /^(\w+|[)\]}"'`])/.exec(member.text)?.[1] ?? ''
      if (/^\d+$/.test(recv) && !/\.[A-Za-z_]/.test(member.text)) return null
      const word = context.matchBefore(/\w*$/)!
      return result(word.from, [...ws.members, ...MEMBERS])
    }

    const word = context.matchBefore(/\w+$/)
    if (!word && !context.explicit) return null
    const names = new Set(ws.globals.map((c) => c.label))
    const words = wordsInDoc(context, word?.text ?? '').filter((c) => !names.has(c.label))
    return result(word?.from ?? context.pos, [...SNIPPETS, ...KEYWORDS, ...GLOBALS, ...ws.globals, ...words])
  }
}
