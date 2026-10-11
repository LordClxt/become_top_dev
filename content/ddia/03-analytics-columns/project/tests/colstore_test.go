package lab

import (
	"reflect"
	"testing"
)

func sales(t *testing.T) *Table {
	t.Helper()
	tb := New("day", "product", "store", "qty")
	rows := [][]string{
		{"2", "B", "s1", "4"}, {"1", "A", "s2", "3"}, {"2", "A", "s1", "5"}, {"1", "B", "s1", "7"},
		{"1", "A", "s1", "2"}, {"2", "B", "s2", "6"}, {"1", "B", "s2", "1"}, {"2", "A", "s2", "8"},
	}
	for _, r := range rows {
		if err := tb.Append(r...); err != nil {
			t.Fatalf("Append(%v) : %v", r, err)
		}
	}
	return tb
}

// ---------- Jalon 1 ----------

func TestM1ColumnsAndRows(t *testing.T) {
	tb := sales(t)
	if tb.Len() != 8 {
		t.Fatalf("Len = %d, attendu 8", tb.Len())
	}
	if got, want := tb.Column("product"), []string{"B", "A", "A", "B", "A", "B", "B", "A"}; !reflect.DeepEqual(got, want) {
		t.Errorf("Column(product) = %v, attendu %v — chaque colonne garde l'ordre d'insertion", got, want)
	}
	if got, want := tb.Row(3), []string{"1", "B", "s1", "7"}; !reflect.DeepEqual(got, want) {
		t.Errorf("Row(3) = %v, attendu %v — la 4ᵉ valeur de CHAQUE colonne, dans l'ordre des colonnes", got, want)
	}
	if tb.Row(8) != nil || tb.Row(-1) != nil {
		t.Error("Row hors limites doit renvoyer nil")
	}
	if tb.Column("nope") != nil {
		t.Error("Column d'une colonne inconnue doit renvoyer nil")
	}
}

func TestM1AppendValidatesArity(t *testing.T) {
	tb := New("a", "b")
	if err := tb.Append("1"); err == nil {
		t.Error("une ligne trop courte doit renvoyer une erreur")
	}
	if err := tb.Append("1", "2", "3"); err == nil {
		t.Error("une ligne trop longue doit renvoyer une erreur")
	}
	if tb.Len() != 0 {
		t.Errorf("Len = %d après deux ajouts refusés, attendu 0 — n'ajoute rien à moitié", tb.Len())
	}
	if err := tb.Append("1", "2"); err != nil || tb.Len() != 1 {
		t.Errorf("Append valide : err=%v len=%d", err, tb.Len())
	}
}

func TestM1ColumnReturnsACopy(t *testing.T) {
	tb := sales(t)
	c := tb.Column("day")
	c[0] = "999"
	if tb.Column("day")[0] != "2" {
		t.Error("Column doit renvoyer une copie : modifier le résultat ne doit pas toucher la table")
	}
}

// ---------- Jalon 2 ----------

func TestM2BitmapAndOrAnd(t *testing.T) {
	prod := []string{"29", "29", "69", "69", "69", "69", "29", "31", "31"}
	store := []string{"3", "3", "3", "5", "5", "3", "3", "5", "3"}
	b29 := Bitmap(prod, "29")
	if want := []bool{true, true, false, false, false, false, true, false, false}; !reflect.DeepEqual(b29, want) {
		t.Fatalf("Bitmap(29) = %v, attendu %v", b29, want)
	}
	or := Or(b29, Bitmap(prod, "31"))
	if want := []bool{true, true, false, false, false, false, true, true, true}; !reflect.DeepEqual(or, want) {
		t.Errorf("OU = %v, attendu %v", or, want)
	}
	and := And(b29, Bitmap(store, "3"))
	if want := []bool{true, true, false, false, false, false, true, false, false}; !reflect.DeepEqual(and, want) {
		t.Errorf("ET = %v, attendu %v", and, want)
	}
	if And(b29, b29[:3]) != nil || Or(b29, b29[:3]) != nil {
		t.Error("longueurs différentes : And et Or doivent renvoyer nil")
	}
}

func TestM2EncodeDecode(t *testing.T) {
	cases := []struct {
		bits string
		runs []int
	}{
		{"110000100", []int{0, 2, 4, 1, 2}},
		{"001111000", []int{2, 4, 3}},
		{"0000", []int{4}},
		{"1111", []int{0, 4}},
		{"", []int{}},
		{"1", []int{0, 1}},
		{"010", []int{1, 1, 1}},
	}
	for _, c := range cases {
		bits := make([]bool, len(c.bits))
		for i, ch := range c.bits {
			bits[i] = ch == '1'
		}
		got := Encode(bits)
		if got == nil || !reflect.DeepEqual(got, c.runs) {
			t.Errorf("Encode(%q) = %v, attendu %v — commence toujours par une séquence de zéros (peut valoir 0)", c.bits, got, c.runs)
		}
		if back := Decode(c.runs); !reflect.DeepEqual(back, bits) && !(len(back) == 0 && len(bits) == 0) {
			t.Errorf("Decode(%v) = %v, attendu %v", c.runs, back, bits)
		}
	}
}

func TestM2RoundTripLarge(t *testing.T) {
	bits := make([]bool, 1000)
	for i := range bits {
		bits[i] = (i/37)%3 == 0
	}
	if back := Decode(Encode(bits)); !reflect.DeepEqual(back, bits) {
		t.Error("Decode(Encode(x)) doit redonner x")
	}
}

// ---------- Jalon 3 ----------

func TestM3SortByKeepsRowsTogether(t *testing.T) {
	tb := sales(t)
	if err := tb.SortBy("day", "product"); err != nil {
		t.Fatal(err)
	}
	if got, want := tb.Column("day"), []string{"1", "1", "1", "1", "2", "2", "2", "2"}; !reflect.DeepEqual(got, want) {
		t.Errorf("day = %v, attendu %v", got, want)
	}
	if got, want := tb.Column("product"), []string{"A", "A", "B", "B", "A", "A", "B", "B"}; !reflect.DeepEqual(got, want) {
		t.Errorf("product = %v, attendu %v", got, want)
	}
	// Les lignes restent des lignes : la ligne (1, A, s2, 3) doit toujours avoir sa quantité 3 et son magasin s2.
	found := false
	for i := 0; i < tb.Len(); i++ {
		if r := tb.Row(i); reflect.DeepEqual(r, []string{"1", "A", "s2", "3"}) {
			found = true
		}
	}
	if !found {
		t.Error("après le tri, la ligne (1, A, s2, 3) a été défaite : on trie des lignes ENTIÈRES, jamais chaque colonne à part")
	}
	// Stable : (1,A,s2,3) était avant (1,A,s1,2) dans l'insertion.
	if tb.Row(0)[3] != "3" || tb.Row(1)[3] != "2" {
		t.Errorf("le tri doit être stable : lignes %v puis %v", tb.Row(0), tb.Row(1))
	}
}

func TestM3SortUnknownColumnLeavesTableUntouched(t *testing.T) {
	tb := sales(t)
	before := tb.Column("day")
	if err := tb.SortBy("day", "nope"); err == nil {
		t.Fatal("colonne inconnue : erreur attendue")
	}
	if !reflect.DeepEqual(tb.Column("day"), before) {
		t.Error("la table ne doit pas être modifiée quand le tri échoue")
	}
}

func TestM3RunsDependOnSortOrder(t *testing.T) {
	tb := sales(t)
	if Runs(tb.Column("day")) != 7 {
		t.Errorf("ordre d'insertion : Runs(day) = %d, attendu 7", Runs(tb.Column("day")))
	}
	tb.SortBy("day", "product")
	if d, p := Runs(tb.Column("day")), Runs(tb.Column("product")); d != 2 || p != 4 {
		t.Errorf("tri (day, product) : Runs = (%d, %d), attendu (2, 4) — seule la première clé se compresse fortement", d, p)
	}
	tb.SortBy("product", "day")
	if d, p := Runs(tb.Column("day")), Runs(tb.Column("product")); d != 4 || p != 2 {
		t.Errorf("tri (product, day) : Runs = (%d, %d), attendu (4, 2)", d, p)
	}
	if Runs(nil) != 0 {
		t.Error("Runs(nil) doit valoir 0")
	}
}

func TestM3SumWhere(t *testing.T) {
	tb := sales(t)
	cases := []struct {
		filters map[string]string
		want    int
	}{
		{nil, 36},
		{map[string]string{"product": "A"}, 18},
		{map[string]string{"product": "A", "day": "1"}, 5},
		{map[string]string{"product": "B", "store": "s1", "day": "2"}, 4},
		{map[string]string{"product": "Z"}, 0},
	}
	for _, c := range cases {
		got, err := tb.SumWhere("qty", c.filters)
		if err != nil || got != c.want {
			t.Errorf("SumWhere(qty, %v) = %d, %v ; attendu %d", c.filters, got, err, c.want)
		}
	}
	if _, err := tb.SumWhere("nope", nil); err == nil {
		t.Error("mesure inconnue : erreur attendue")
	}
	if _, err := tb.SumWhere("qty", map[string]string{"nope": "x"}); err == nil {
		t.Error("filtre sur une colonne inconnue : erreur attendue")
	}
	if _, err := tb.SumWhere("product", nil); err == nil {
		t.Error("mesure non entière : erreur attendue")
	}
}

func TestM3SumWhereAfterSort(t *testing.T) {
	tb := sales(t)
	tb.SortBy("product", "store")
	got, err := tb.SumWhere("qty", map[string]string{"product": "B", "day": "1"})
	if err != nil || got != 8 {
		t.Errorf("SumWhere après tri = %d, %v ; attendu 8 (7 + 1)", got, err)
	}
}
