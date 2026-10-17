import { eq, run, test } from './spec.ts';
import { omit, pick } from './utilities.ts';

test('pick et omit', () => {
  const user = { name: 'Ada', age: 36, admin: true };
  eq(pick(user, 'name', 'age'), { name: 'Ada', age: 36 }, 'pick');
  eq(omit(user, 'admin'), { name: 'Ada', age: 36 }, 'omit');
  eq(omit(user), user, 'omit sans clé');
  eq(user, { name: 'Ada', age: 36, admin: true }, "l'original ne change pas");
});

await run();
