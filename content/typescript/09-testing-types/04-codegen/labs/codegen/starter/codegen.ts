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

// TODO 1
export function tsTypeOf(column: ColumnType): string {
  throw new Error('TODO: tsTypeOf');
}

// TODO 2
export function toPascalCase(name: string): string {
  throw new Error('TODO: toPascalCase');
}

// TODO 3
export function generateInterface(table: Table): string {
  throw new Error('TODO: generateInterface');
}

// TODO 4
export function generateFile(tables: readonly Table[]): string {
  throw new Error('TODO: generateFile');
}

// TODO 5
export function isUpToDate(committed: string, tables: readonly Table[]): boolean {
  throw new Error('TODO: isUpToDate');
}
