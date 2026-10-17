import { EventBus } from './bus.ts';

interface AppEvents {
  selected: { id: number };
}
declare const bus: EventBus<AppEvents>;

bus.on('selected', (p) => p.id.toFixed());
// @ts-expect-error événement inconnu
bus.on('deleted', () => {});
// @ts-expect-error charge du mauvais type
bus.emit('selected', { id: '1' });
// @ts-expect-error un handler trop restrictif est refusé (pas de bivariance)
bus.on('selected', (p: { id: 1 }) => p);
