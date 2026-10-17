import { eq, run, test } from './spec.ts';
import { allPlayers, bestPaidByTeam, parseCSV, payroll, toPlayers } from './rosters.ts';

const csv = 'name,team,salary\nAda,Lakers,30\nBob,Bulls,50\n\nCy,Lakers,45\n';

test('parseCSV', () => {
  eq(parseCSV(csv), [
    { name: 'Ada', team: 'Lakers', salary: '30' },
    { name: 'Bob', team: 'Bulls', salary: '50' },
    { name: 'Cy', team: 'Lakers', salary: '45' },
  ], 'parseCSV');
  eq(parseCSV('a,b'), [], 'en-têtes seuls');
});

test('toPlayers', () => {
  eq(toPlayers([{ name: 'Ada', team: 'Lakers', salary: '30' }]), [{ name: 'Ada', team: 'Lakers', salary: 30 }], 'toPlayers');
});

test('allPlayers', () => {
  const a = { name: 'A', team: 'X', salary: 1 };
  const b = { name: 'B', team: 'Y', salary: 2 };
  eq(allPlayers({ X: [a], Y: [b], Z: [] }), [a, b], 'allPlayers');
});

test('bestPaidByTeam et payroll', () => {
  const players = toPlayers(parseCSV(csv));
  const before = players.map((p) => p.name);
  eq(bestPaidByTeam(players), new Map([['Lakers', 'Cy'], ['Bulls', 'Bob']]), 'bestPaidByTeam');
  eq(players.map((p) => p.name), before, 'players non modifié');
  eq(payroll(players), { Lakers: 75, Bulls: 50 }, 'payroll');
  eq(payroll([]), {}, 'payroll([])');
});

await run();
