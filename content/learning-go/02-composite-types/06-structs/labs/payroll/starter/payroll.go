package lab

// Employee décrit une personne et son service.
type Employee struct {
	ID     int
	Name   string
	Dept   string
	Salary int
}

// DeptTotal résume un service : effectif et masse salariale.
type DeptTotal struct {
	Dept      string
	Headcount int
	Total     int
}

// PayrollByDept renvoie un DeptTotal par service, trié par nom de service.
func PayrollByDept(emps []Employee) []DeptTotal {
	// TODO: regroupe par service avec une map, puis trie le résultat
	return nil
}
