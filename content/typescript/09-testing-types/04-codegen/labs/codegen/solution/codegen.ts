export type ColumnType =
  | 'text' | 'uuid' | 'int' | 'float' | 'bool' | 'timestamptz' | 'json'
  | { enum: readonly string[] }
  | { array: ColumnType };

export interface Column {
  name: string;
  type: ColumnType;
  nullable?: boolean;
}

export interface Table {
  name: string;
  description?: string;
  columns: readonly Column[];
}

const SCALARS = { text: 'string', uuid: 'string', int: 'number', float: 'number', bool: 'boolean', timestamptz: 'Date', json: 'unknown' } as const;

export function tsTypeOf(column: ColumnType): string {
  if (typeof column === 'string') return SCALARS[column];
  if ('enum' in column) return column.enum.map((v) => `'${v}'`).join(' | ');
  const inner = tsTypeOf(column.array);
  return inner.includes('|') ? `(${inner})[]` : `${inner}[]`;
}

export function toPascalCase(name: string): string {
  return name.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

export function generateInterface(table: Table): string {
  const lines = [
    ...(table.description ? [`/** ${table.description} */`] : []),
    `export interface ${toPascalCase(table.name)} {`,
    ...table.columns.map((c) => `  ${c.name}${c.nullable ? '?' : ''}: ${tsTypeOf(c.type)};`),
    '}',
  ];
  return lines.join('\n');
}

export function generateFile(tables: readonly Table[]): string {
  const interfaces = tables
    .toSorted((a, b) => toPascalCase(a.name).localeCompare(toPascalCase(b.name)))
    .map(generateInterface);
  return ['// Fichier généré : ne pas modifier.', '', interfaces.join('\n\n'), ''].join('\n');
}

export function isUpToDate(committed: string, tables: readonly Table[]): boolean {
  return committed === generateFile(tables);
}
