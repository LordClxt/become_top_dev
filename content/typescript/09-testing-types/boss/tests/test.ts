import { eq, raises, run, test } from './spec.ts';
import { createClient, generateTypes } from './sdk.ts';

const spec = {
  getUser: { method: 'GET', path: '/users/:id', response: { name: 'string', tags: 'string[]', age: 'number?' } },
  getPost: { method: 'GET', path: '/users/:userId/posts/:postId', response: { title: 'string', draft: 'boolean' } },
  health: { method: 'GET', path: '/health', response: { ok: 'boolean' } },
} as const;

function fakeTransport(responses: Record<string, unknown>) {
  const calls: string[] = [];
  const transport = async (method: string, url: string) => {
    calls.push(`${method} ${url}`);
    return responses[url];
  };
  return { transport, calls };
}

test('createClient : URL et validation', async () => {
  const { transport, calls } = fakeTransport({
    '/users/7': { name: 'Ada', tags: ['x'], extra: true },
    '/users/a%20b/posts/42': { title: 'Bonjour', draft: false },
    '/health': { ok: true },
  });
  const client = createClient(spec, transport);
  eq(await client.getUser({ id: '7' }), { name: 'Ada', tags: ['x'] }, 'champ inconnu retiré, optionnel absent');
  eq(await client.getPost({ userId: 'a b', postId: '42' }), { title: 'Bonjour', draft: false }, 'deux paramètres encodés');
  eq(await client.health({}), { ok: true }, 'sans paramètre');
  eq(calls, ['GET /users/7', 'GET /users/a%20b/posts/42', 'GET /health'], 'appels');
});

test('createClient : réponses invalides', async () => {
  const { transport } = fakeTransport({
    '/users/1': { name: 'Ada', tags: [1] },
    '/users/2': { name: 'Ada', tags: [], age: 'vieux' },
    '/users/3': 'oups',
    '/health': {},
  });
  const client = createClient(spec, transport);
  eq((await raises(() => client.getUser({ id: '1' }), 'tags')).message, 'réponse invalide : tags', 'tableau invalide');
  eq((await raises(() => client.getUser({ id: '2' }), 'age')).message, 'réponse invalide : age', 'optionnel invalide');
  eq((await raises(() => client.getUser({ id: '3' }), 'chaîne')).message, 'réponse invalide : objet attendu', 'pas un objet');
  eq((await raises(() => client.health({}), 'ok manquant')).message, 'réponse invalide : ok', 'champ manquant');
});

test('generateTypes', () => {
  eq(generateTypes(spec), [
    'export interface GetPostResponse {',
    '  title: string;',
    '  draft: boolean;',
    '}',
    '',
    'export interface GetUserResponse {',
    '  name: string;',
    '  tags: string[];',
    '  age?: number;',
    '}',
    '',
    'export interface HealthResponse {',
    '  ok: boolean;',
    '}',
  ].join('\n'), 'code généré');
});

await run();
