import type { Equals, Expect } from './expect.ts';
import { createClient } from './sdk.ts';
import type { FieldType, PathParams, ResponseOf } from './sdk.ts';

const spec = {
  getUser: { method: 'GET', path: '/users/:id', response: { name: 'string', tags: 'string[]', age: 'number?' } },
  health: { method: 'GET', path: '/health', response: { ok: 'boolean' } },
} as const;
declare const transport: (method: 'GET' | 'POST' | 'DELETE', url: string) => Promise<unknown>;
const client = createClient(spec, transport);
const user = client.getUser({ id: '1' });

type LongPath = '/a/:p1/b/:p2/c/:p3/d/:p4/e/:p5/f/:p6/g/:p7/h/:p8/i/:p9/j/:p10/k/:p11/l/:p12/m/:p13/n/:p14/o/:p15/p/:p16/q/:p17/r/:p18/s/:p19/t/:p20/u/:p21/v/:p22/w/:p23/x/:p24/y/:p25/z/:p26/a/:p27/b/:p28/c/:p29/d/:p30/e/:p31/f/:p32/g/:p33/h/:p34/i/:p35/j/:p36/k/:p37/l/:p38/m/:p39/n/:p40/o/:p41/p/:p42/q/:p43/r/:p44/s/:p45/t/:p46/u/:p47/v/:p48/w/:p49/x/:p50/y/:p51/z/:p52/a/:p53/b/:p54/c/:p55';

export type Checks = [
  Expect<Equals<FieldType<'number[]?'>, number[]>>,
  Expect<Equals<ResponseOf<{ a: 'string'; b: 'boolean?' }>, { a: string; b?: boolean }>>,
  Expect<Equals<PathParams<'/users/:userId/posts/:postId'>, { userId: string; postId: string }>>,
  Expect<Equals<PathParams<'/health'>, {}>>,
  Expect<Equals<PathParams<LongPath>['p55'], string>>,
  Expect<Equals<'p1' | 'p30' | 'p55' extends keyof PathParams<LongPath> ? true : false, true>>,
  Expect<Equals<typeof user, Promise<{ name: string; tags: string[]; age?: number }>>>,
];

// @ts-expect-error paramètre manquant
client.getUser({});
// @ts-expect-error endpoint inconnu
client.deleteUser({ id: '1' });
