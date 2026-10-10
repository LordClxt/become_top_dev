package lab

import (
	"slices"
	"strings"
)

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
	byDept := map[string]DeptTotal{}
	for _, e := range emps {
		t := byDept[e.Dept]
		t.Dept = e.Dept
		t.Headcount++
		t.Total += e.Salary
		byDept[e.Dept] = t
	}
	out := make([]DeptTotal, 0, len(byDept))
	for _, t := range byDept {
		out = append(out, t)
	}
	slices.SortFunc(out, func(a, b DeptTotal) int {
		return strings.Compare(a.Dept, b.Dept)
	})
	return out
}
