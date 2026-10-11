package lab

import (
	"errors"
	"reflect"
	"testing"
)

func TestReadUser(t *testing.T) {
	tests := []struct {
		name string
		doc  map[string]any
		want User
		err  error
	}{
		{"v2", map[string]any{"first_name": "Ada", "last_name": "Lovelace"}, User{"Ada", "Lovelace"}, nil},
		{"v2 sans nom de famille", map[string]any{"first_name": "Cher"}, User{"Cher", ""}, nil},
		{"v1", map[string]any{"name": "Ada Lovelace"}, User{"Ada", "Lovelace"}, nil},
		{"v1 nom composé", map[string]any{"name": "Ludwig van Beethoven"}, User{"Ludwig", "van Beethoven"}, nil},
		{"v1 un seul mot", map[string]any{"name": "Madonna"}, User{"Madonna", ""}, nil},
		{"v1 espaces autour", map[string]any{"name": "  Alan Turing  "}, User{"Alan", "Turing"}, nil},
		{"v2 l'emporte", map[string]any{"name": "Vieux Nom", "first_name": "Nouveau", "last_name": "Nom"}, User{"Nouveau", "Nom"}, nil},
		{"aucun nom", map[string]any{"age": 3}, User{}, ErrNoName},
		{"nom vide", map[string]any{"name": "   "}, User{}, ErrNoName},
		{"mauvais type v1", map[string]any{"name": 42}, User{}, ErrBadType},
		{"mauvais type v2", map[string]any{"first_name": 1.5}, User{}, ErrBadType},
		{"mauvais type last_name", map[string]any{"first_name": "A", "last_name": true}, User{}, ErrBadType},
	}
	for _, tt := range tests {
		got, err := ReadUser(tt.doc)
		if !errors.Is(err, tt.err) {
			t.Errorf("%s : erreur = %v, attendu %v", tt.name, err, tt.err)
			continue
		}
		if got != tt.want {
			t.Errorf("%s : %+v, attendu %+v", tt.name, got, tt.want)
		}
	}
}

func TestMigrate(t *testing.T) {
	docs := []map[string]any{
		{"id": 1, "name": "Ada Lovelace"},
		{"id": 2, "first_name": "Alan", "last_name": "Turing"},
		{"id": 3, "name": "Madonna"},
	}
	n, err := Migrate(docs)
	if err != nil || n != 2 {
		t.Fatalf("Migrate = %d, %v, attendu 2, nil", n, err)
	}
	want := []map[string]any{
		{"id": 1, "first_name": "Ada", "last_name": "Lovelace"},
		{"id": 2, "first_name": "Alan", "last_name": "Turing"},
		{"id": 3, "first_name": "Madonna", "last_name": ""},
	}
	if !reflect.DeepEqual(docs, want) {
		t.Errorf("documents = %v, attendu %v — name doit disparaître, les autres champs rester", docs, want)
	}
	if n, err := Migrate(docs); err != nil || n != 0 {
		t.Errorf("seconde migration = %d, %v, attendu 0, nil (idempotente)", n, err)
	}
}

func TestMigrateStopsOnBadDocument(t *testing.T) {
	docs := []map[string]any{
		{"name": "Ada Lovelace"},
		{"name": 3},
		{"name": "Alan Turing"},
	}
	n, err := Migrate(docs)
	if !errors.Is(err, ErrBadType) || n != 1 {
		t.Errorf("Migrate = %d, %v, attendu 1, ErrBadType", n, err)
	}
	if _, ok := docs[2]["first_name"]; ok {
		t.Error("la migration doit s'arrêter au premier document illisible")
	}
}
