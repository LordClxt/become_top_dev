package lab

import (
	"slices"
	"testing"
)

func TestPayrollByDept(t *testing.T) {
	emps := []Employee{
		{ID: 1, Name: "Ana", Dept: "Tech", Salary: 5000},
		{ID: 2, Name: "Léo", Dept: "Ventes", Salary: 3000},
		{ID: 3, Name: "Mia", Dept: "Tech", Salary: 4500},
		{ID: 4, Name: "Noé", Dept: "Achats", Salary: 2800},
	}
	want := []DeptTotal{
		{Dept: "Achats", Headcount: 1, Total: 2800},
		{Dept: "Tech", Headcount: 2, Total: 9500},
		{Dept: "Ventes", Headcount: 1, Total: 3000},
	}
	got := PayrollByDept(emps)
	if !slices.Equal(got, want) {
		t.Errorf("PayrollByDept = %v\nattendu        %v", got, want)
	}
}

func TestPayrollSortedRegardlessOfInputOrder(t *testing.T) {
	emps := []Employee{
		{Dept: "Z", Salary: 1}, {Dept: "A", Salary: 1}, {Dept: "M", Salary: 1},
	}
	for i := 0; i < 20; i++ {
		got := PayrollByDept(emps)
		if len(got) != 3 || got[0].Dept != "A" || got[1].Dept != "M" || got[2].Dept != "Z" {
			t.Fatalf("résultat non trié : %v — l'ordre d'une map est aléatoire, il faut trier", got)
		}
	}
}

func TestPayrollEmpty(t *testing.T) {
	if got := PayrollByDept(nil); len(got) != 0 {
		t.Errorf("PayrollByDept(nil) doit être de longueur 0, obtenu %v", got)
	}
}

func TestPayrollDoesNotModifyInput(t *testing.T) {
	emps := []Employee{{ID: 1, Dept: "B", Salary: 10}, {ID: 2, Dept: "A", Salary: 20}}
	before := slices.Clone(emps)
	PayrollByDept(emps)
	if !slices.Equal(emps, before) {
		t.Errorf("l'entrée a été modifiée : %v", emps)
	}
}
