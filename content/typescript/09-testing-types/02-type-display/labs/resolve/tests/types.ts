import type { Equals, Expect } from './expect.ts';
import { withDefaults } from './display.ts';
import type { PartiallyPartial, Resolve, WithId } from './display.ts';

interface BlogComment { commentId: number; title: string; content: string }
type Fn = (x: number) => string;
const merged = withDefaults({ theme: 'dark', size: 14 }, { size: 16, compact: true });

export type Checks = [
  Expect<Equals<Resolve<{ a: 1 } & { b: 2 }>, { a: 1; b: 2 }>>,
  Expect<Equals<Resolve<Fn>, Fn>>,
  Expect<Equals<PartiallyPartial<BlogComment, 'title'>, { title?: string; commentId: number; content: string }>>,
  Expect<Equals<PartiallyPartial<BlogComment, never>, BlogComment>>,
  Expect<Equals<WithId<{ name: string }>, { name: string; id: string }>>,
  Expect<Equals<typeof merged, { theme: string; size: number; compact: boolean }>>,
];
