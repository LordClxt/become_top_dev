export interface Player {
  name: string;
  team: string;
  salary: number;
}

// TODO 1 : retour inféré { [k: string]: string }[] (Object.fromEntries), lignes vides ignorées.
export function parseCSV(csv: string) {
  throw new Error('TODO: parseCSV');
}

// TODO 2 : salary en nombre.
export function toPlayers(rows: readonly Record<string, string>[]): Player[] {
  throw new Error('TODO: toPlayers');
}

// TODO 3 : tous les joueurs, en une expression.
export function allPlayers(rosters: Record<string, readonly Player[]>): Player[] {
  throw new Error('TODO: allPlayers');
}

// TODO 4 : équipe → nom du mieux payé (Map.groupBy + toSorted), sans muter players.
export function bestPaidByTeam(players: readonly Player[]): Map<string, string> {
  throw new Error('TODO: bestPaidByTeam');
}

// TODO 5 : équipe → masse salariale.
export function payroll(players: readonly Player[]): Record<string, number> {
  throw new Error('TODO: payroll');
}
