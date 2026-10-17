import { eq, run, test } from './spec.ts';
import { generateFile, generateInterface, isUpToDate, toPascalCase, tsTypeOf } from './codegen.ts';
import type { Table } from './codegen.ts';

const users: Table = {
  name: 'users',
  description: 'Un compte utilisateur.',
  columns: [
    { name: 'id', type: 'uuid' },
    { name: 'role', type: { enum: ['admin', 'user'] } },
    { name: 'tags', type: { array: 'text' }, nullable: true },
    { name: 'created_at', type: 'timestamptz' },
  ],
};
const posts: Table = {
  name: 'blog_posts',
  columns: [
    { name: 'id', type: 'int' },
    { name: 'meta', type: 'json', nullable: true },
    { name: 'flags', type: { array: { enum: ['a', 'b'] } } },
  ],
};

test('tsTypeOf', () => {
  eq(['text', 'uuid', 'int', 'float', 'bool', 'timestamptz', 'json'].map((t) => tsTypeOf(t as 'text')),
    ['string', 'string', 'number', 'number', 'boolean', 'Date', 'unknown'], 'scalaires');
  eq(tsTypeOf({ enum: ['admin', 'user'] }), "'admin' | 'user'", 'enum');
  eq(tsTypeOf({ array: 'int' }), 'number[]', 'tableau');
  eq(tsTypeOf({ array: { enum: ['a', 'b'] } }), "('a' | 'b')[]", 'tableau d’union');
  eq(tsTypeOf({ array: { array: 'bool' } }), 'boolean[][]', 'tableau de tableaux');
});

test('toPascalCase', () => {
  eq(toPascalCase('blog_posts'), 'BlogPosts', 'blog_posts');
  eq(toPascalCase('users'), 'Users', 'users');
});

test('generateInterface', () => {
  eq(generateInterface(users), [
    '/** Un compte utilisateur. */',
    'export interface Users {',
    '  id: string;',
    "  role: 'admin' | 'user';",
    '  tags?: string[];',
    '  created_at: Date;',
    '}',
  ].join('\n'), 'users');
});

test('generateFile et isUpToDate', () => {
  const file = generateFile([users, posts]);
  eq(file, [
    '// Fichier généré : ne pas modifier.',
    '',
    'export interface BlogPosts {',
    '  id: number;',
    '  meta?: unknown;',
    "  flags: ('a' | 'b')[];",
    '}',
    '',
    '/** Un compte utilisateur. */',
    'export interface Users {',
    '  id: string;',
    "  role: 'admin' | 'user';",
    '  tags?: string[];',
    '  created_at: Date;',
    '}',
    '',
  ].join('\n'), 'fichier');
  eq(isUpToDate(file, [posts, users]), true, 'à jour');
  const changed = { ...posts, columns: [...posts.columns, { name: 'title', type: 'text' as const }] };
  eq(isUpToDate(file, [changed, users]), false, 'schéma modifié');
});

await run();
