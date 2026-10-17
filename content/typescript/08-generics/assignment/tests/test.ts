import { eq, run, test } from './spec.ts';
import { dispatch, getPath } from './paths.ts';

const config = {
  db: { host: 'localhost', pool: { max: 10, min: 1 } },
  tags: ['a', 'b'],
  debug: false,
};

test('getPath', () => {
  eq(getPath(config, 'db.pool.max'), 10, 'db.pool.max');
  eq(getPath(config, 'db.host'), 'localhost', 'db.host');
  eq(getPath(config, 'db.pool'), { max: 10, min: 1 }, 'chemin intermédiaire');
  eq(getPath(config, 'tags'), ['a', 'b'], 'tableau');
  eq(getPath(config, 'debug'), false, 'booléen');
});

interface AppEvents { save: { id: number }; load: string }

test('dispatch', () => {
  const log: string[] = [];
  const handlers = { onSave: (p: { id: number }) => log.push(`save ${p.id}`) };
  eq(dispatch<AppEvents, 'save'>(handlers, 'save', { id: 3 }), true, 'handler présent');
  eq(dispatch<AppEvents, 'load'>(handlers, 'load', 'x'), false, 'handler absent');
  eq(log, ['save 3'], 'appelé une fois');
});

await run();
