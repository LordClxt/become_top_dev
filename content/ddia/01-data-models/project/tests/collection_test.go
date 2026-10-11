package lab

import (
	"errors"
	"reflect"
	"testing"
)

// Trois versions : v1 {name, city}  →  v2 {first_name, last_name, city}  →  v3 {first_name, last_name, address:{city}}.
func upgraders() []Upgrader {
	return []Upgrader{
		func(d Doc) (Doc, error) {
			name, ok := d["name"].(string)
			if !ok {
				return nil, errors.New("name manquant")
			}
			first, last := name, ""
			for i, r := range name {
				if r == ' ' {
					first, last = name[:i], name[i+1:]
					break
				}
			}
			delete(d, "name")
			d["first_name"], d["last_name"] = first, last
			return d, nil
		},
		func(d Doc) (Doc, error) {
			if city, ok := d["city"]; ok {
				d["address"] = map[string]any{"city": city}
				delete(d, "city")
			}
			return d, nil
		},
	}
}

func newColl() *Collection { return NewCollection(upgraders()...) }

// ---------- Jalon 1 ----------

func TestM1PutGetDelete(t *testing.T) {
	c := newColl()
	if c.CurrentVersion() != 3 {
		t.Fatalf("CurrentVersion = %d, attendu 3", c.CurrentVersion())
	}
	c.Put("u1", Doc{"first_name": "Ada", "last_name": "Lovelace", "address": map[string]any{"city": "Londres"}})
	raw, ok := c.Raw("u1")
	if !ok || raw["_v"] != 3 || raw["first_name"] != "Ada" {
		t.Errorf("Raw = %v, %v, attendu un document estampillé _v=3", raw, ok)
	}
	if c.Len() != 1 || !c.Delete("u1") || c.Delete("u1") || c.Len() != 0 {
		t.Error("Len/Delete incohérents")
	}
	if _, ok := c.Raw("u1"); ok {
		t.Error("Raw d'un document supprimé")
	}
}

func TestM1CopiesAreDeep(t *testing.T) {
	c := newColl()
	in := Doc{"first_name": "Ada", "address": map[string]any{"city": "Londres"}, "tags": []any{"a", "b"}}
	c.Put("u1", in)
	in["first_name"] = "Modifié"
	in["address"].(map[string]any)["city"] = "Paris"
	in["tags"].([]any)[0] = "z"
	if _, present := in["_v"]; present {
		t.Error("Put ne doit pas modifier le document de l'appelant")
	}
	raw, _ := c.Raw("u1")
	if raw["first_name"] != "Ada" || raw["address"].(map[string]any)["city"] != "Londres" || raw["tags"].([]any)[0] != "a" {
		t.Errorf("le stockage partage de la mémoire avec l'appelant : %v", raw)
	}
	raw["address"].(map[string]any)["city"] = "Rome"
	again, _ := c.Raw("u1")
	if again["address"].(map[string]any)["city"] != "Londres" {
		t.Error("Raw doit renvoyer une copie profonde")
	}
}

func TestM1PutRawKeepsVersion(t *testing.T) {
	c := newColl()
	c.PutRaw("old", Doc{"name": "Ada Lovelace", "city": "Londres"})
	raw, _ := c.Raw("old")
	if _, has := raw["_v"]; has {
		t.Errorf("PutRaw ne doit pas ajouter _v : %v", raw)
	}
	c.PutRaw("v2", Doc{"_v": 2, "first_name": "Alan"})
	if raw, _ := c.Raw("v2"); raw["_v"] != 2 {
		t.Errorf("PutRaw doit conserver _v : %v", raw)
	}
}

// ---------- Jalon 2 ----------

func TestM2GetUpgradesOnRead(t *testing.T) {
	c := newColl()
	c.PutRaw("v1", Doc{"name": "Ada Lovelace", "city": "Londres", "age": 36})
	c.PutRaw("v2", Doc{"_v": 2, "first_name": "Alan", "last_name": "Turing", "city": "Wilmslow"})
	c.Put("v3", Doc{"first_name": "Grace", "last_name": "Hopper", "address": map[string]any{"city": "New York"}})

	want := map[string]Doc{
		"v1": {"_v": 3, "first_name": "Ada", "last_name": "Lovelace", "address": map[string]any{"city": "Londres"}, "age": 36},
		"v2": {"_v": 3, "first_name": "Alan", "last_name": "Turing", "address": map[string]any{"city": "Wilmslow"}},
		"v3": {"_v": 3, "first_name": "Grace", "last_name": "Hopper", "address": map[string]any{"city": "New York"}},
	}
	for id, w := range want {
		got, err := c.Get(id)
		if err != nil || !reflect.DeepEqual(got, w) {
			t.Errorf("Get(%s) = %v, %v\n   attendu %v", id, got, err, w)
		}
	}
	raw, _ := c.Raw("v1")
	if raw["name"] != "Ada Lovelace" || raw["_v"] != nil {
		t.Errorf("la mise à niveau à la lecture ne doit pas modifier le stockage : %v", raw)
	}
}

func TestM2GetErrors(t *testing.T) {
	c := newColl()
	if _, err := c.Get("absent"); !errors.Is(err, ErrNotFound) {
		t.Errorf("document absent : %v", err)
	}
	c.PutRaw("future", Doc{"_v": 9, "x": 1})
	if _, err := c.Get("future"); !errors.Is(err, ErrFutureVersion) {
		t.Errorf("version future : %v, attendu ErrFutureVersion", err)
	}
	c.PutRaw("broken", Doc{"city": "Londres"}) // v1 sans « name » : l'upgrader échoue
	_, err := c.Get("broken")
	if err == nil || errors.Is(err, ErrNotFound) {
		t.Fatalf("upgrader en échec : %v", err)
	}
	sentinel := errors.New("boom")
	c2 := NewCollection(func(d Doc) (Doc, error) { return nil, sentinel })
	c2.PutRaw("x", Doc{})
	if _, err := c2.Get("x"); !errors.Is(err, sentinel) {
		t.Errorf("l'erreur de l'upgrader doit être enveloppée avec %%w : %v", err)
	}
}

func TestM2GetReturnsIndependentCopy(t *testing.T) {
	c := newColl()
	c.PutRaw("v1", Doc{"name": "Ada Lovelace", "city": "Londres"})
	d, _ := c.Get("v1")
	d["first_name"] = "Modifié"
	again, _ := c.Get("v1")
	if again["first_name"] != "Ada" {
		t.Error("modifier le résultat de Get ne doit pas modifier le stockage")
	}
}

// ---------- Jalon 3 ----------

func TestM3FindAcrossVersions(t *testing.T) {
	c := newColl()
	c.PutRaw("a", Doc{"name": "Ada Lovelace", "city": "Londres"})
	c.PutRaw("b", Doc{"_v": 2, "first_name": "Alan", "last_name": "Turing", "city": "Londres"})
	c.Put("c", Doc{"first_name": "Grace", "last_name": "Hopper", "address": map[string]any{"city": "New York"}})
	c.PutRaw("d", Doc{"_v": 9})
	if got := c.Find("address.city", "Londres"); !reflect.DeepEqual(got, []string{"a", "b"}) {
		t.Errorf("Find(address.city = Londres) = %v, attendu [a b] : les anciens documents se cherchent comme s'ils étaient à jour", got)
	}
	if got := c.Find("last_name", "Hopper"); !reflect.DeepEqual(got, []string{"c"}) {
		t.Errorf("Find(last_name) = %v", got)
	}
	if got := c.Find("address.zip", "x"); len(got) != 0 {
		t.Errorf("chemin inexistant : %v", got)
	}
	if got := c.Find("address", map[string]any{"city": "New York"}); !reflect.DeepEqual(got, []string{"c"}) {
		t.Errorf("comparaison d'une valeur imbriquée : %v", got)
	}
}

func TestM3MigrateRewritesStorage(t *testing.T) {
	c := newColl()
	c.PutRaw("b", Doc{"name": "Alan Turing", "city": "Wilmslow"})
	c.PutRaw("a", Doc{"name": "Ada Lovelace", "city": "Londres"})
	c.Put("c", Doc{"first_name": "Grace"})
	if p := c.PendingMigration(); p != 2 {
		t.Fatalf("PendingMigration = %d, attendu 2", p)
	}
	n, err := c.Migrate()
	if err != nil || n != 2 {
		t.Fatalf("Migrate = %d, %v, attendu 2, nil", n, err)
	}
	raw, _ := c.Raw("a")
	want := Doc{"_v": 3, "first_name": "Ada", "last_name": "Lovelace", "address": map[string]any{"city": "Londres"}}
	if !reflect.DeepEqual(raw, want) {
		t.Errorf("Raw(a) après Migrate = %v, attendu %v", raw, want)
	}
	if c.PendingMigration() != 0 {
		t.Error("il ne doit plus rien rester à migrer")
	}
	if n, err := c.Migrate(); n != 0 || err != nil {
		t.Errorf("seconde migration = %d, %v, attendu 0, nil", n, err)
	}
}

func TestM3MigrateStopsAtFirstFailure(t *testing.T) {
	c := newColl()
	c.PutRaw("a", Doc{"name": "Ada Lovelace"})
	c.PutRaw("b", Doc{"city": "sans nom"}) // échoue
	c.PutRaw("c", Doc{"name": "Grace Hopper"})
	n, err := c.Migrate()
	if err == nil || n != 1 {
		t.Fatalf("Migrate = %d, %v, attendu 1 et une erreur", n, err)
	}
	if rawC, _ := c.Raw("c"); rawC["_v"] != nil {
		t.Error("la migration doit s'arrêter au premier échec (ordre alphabétique des identifiants)")
	}
	if c.PendingMigration() != 2 {
		t.Errorf("PendingMigration = %d, attendu 2", c.PendingMigration())
	}
}
