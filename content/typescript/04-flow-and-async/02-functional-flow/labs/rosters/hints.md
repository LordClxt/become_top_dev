## Hint 1
`const [header, ...lines] = csv.split('\n');` puis `lines.filter((l) => l.trim() !== '').map((line) => Object.fromEntries(line.split(',').map((v, j) => [headers[j], v])))`.

## Hint 2
`Object.values(rosters).flat()`. Pour bestPaidByTeam : `new Map([...Map.groupBy(players, (p) => p.team)].map(([team, ps]) => [team, …]))`.

## Hint 3
payroll : `Object.fromEntries([...Map.groupBy(players, (p) => p.team)].map(([team, ps]) => [team, ps.reduce((s, p) => s + p.salary, 0)]))`.
