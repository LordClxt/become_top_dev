export interface Player {
  name: string;
  team: string;
  salary: number;
}

export function parseCSV(csv: string) {
  const [header = '', ...lines] = csv.split('\n');
  const headers = header.split(',');
  return lines
    .filter((line) => line.trim() !== '')
    .map((line) => Object.fromEntries(line.split(',').map((value, j) => [headers[j], value])));
}

export function toPlayers(rows: readonly Record<string, string>[]): Player[] {
  return rows.map((row) => ({ name: row.name ?? '', team: row.team ?? '', salary: Number(row.salary) }));
}

export function allPlayers(rosters: Record<string, readonly Player[]>): Player[] {
  return Object.values(rosters).flat();
}

export function bestPaidByTeam(players: readonly Player[]): Map<string, string> {
  return new Map(
    [...Map.groupBy(players, (p) => p.team)].map(([team, ps]) => [team, ps.toSorted((a, b) => b.salary - a.salary)[0]?.name ?? '']),
  );
}

export function payroll(players: readonly Player[]): Record<string, number> {
  return Object.fromEntries(
    [...Map.groupBy(players, (p) => p.team)].map(([team, ps]) => [team, ps.reduce((sum, p) => sum + p.salary, 0)]),
  );
}
