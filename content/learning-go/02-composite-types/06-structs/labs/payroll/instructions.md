## Contexte

Le service RH veut un rapport : pour chaque service (Dept), combien de personnes y travaillent et combien coûtent leurs salaires au total.

## Ta mission

Les types sont déjà définis dans `payroll.go` :

```go
type Employee struct {
	ID     int
	Name   string
	Dept   string
	Salary int
}

type DeptTotal struct {
	Dept      string
	Headcount int
	Total     int
}
```

Implémente :

```go
func PayrollByDept(emps []Employee) []DeptTotal
```

- Un `DeptTotal` par service présent dans `emps`.
- Résultat trié par nom de service (ordre alphabétique).
- Si `emps` est vide, renvoie une slice de longueur 0.

```go
PayrollByDept([]Employee{
	{ID: 1, Name: "Ana", Dept: "Tech", Salary: 5000},
	{ID: 2, Name: "Léo", Dept: "Ventes", Salary: 3000},
	{ID: 3, Name: "Mia", Dept: "Tech", Salary: 4500},
})
// [{Tech 2 9500} {Ventes 1 3000}]
```
