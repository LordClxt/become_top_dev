package content

import (
	_ "embed"
	"fmt"
	"slices"
	"sync"

	"go.yaml.in/yaml/v3"
)

// Catalogue des composants de l'éditeur de diagrammes (voir catalog.yaml).

//go:embed catalog.yaml
var catalogYAML []byte

type CatalogCategory struct {
	ID    string `yaml:"id" json:"id"`
	Label string `yaml:"label" json:"label"`
	Color string `yaml:"color" json:"color"`
}

type CatalogProp struct {
	ID      string   `yaml:"id" json:"id"`
	Label   string   `yaml:"label" json:"label"`
	Kind    string   `yaml:"kind" json:"kind"` // "" (liste d'options) | text
	Options []string `yaml:"options" json:"options"`
	Default string   `yaml:"default" json:"default"`
}

type CatalogComponent struct {
	ID       string        `yaml:"id" json:"id"`
	Label    string        `yaml:"label" json:"label"`
	Category string        `yaml:"category" json:"category"`
	Icon     string        `yaml:"icon" json:"icon"`
	Hint     string        `yaml:"hint" json:"hint"`
	Zone     bool          `yaml:"zone" json:"zone"`
	Props    []CatalogProp `yaml:"props" json:"props"`
}

type Catalog struct {
	Categories []CatalogCategory  `yaml:"categories" json:"categories"`
	Components []CatalogComponent `yaml:"components" json:"components"`
}

var (
	catalogOnce sync.Once
	catalogVal  *Catalog
	catalogErr  error
)

// DiagramCatalog renvoie le catalogue embarqué, validé.
func DiagramCatalog() (*Catalog, error) {
	catalogOnce.Do(func() {
		var c Catalog
		if err := yaml.Unmarshal(catalogYAML, &c); err != nil {
			catalogErr = fmt.Errorf("catalog.yaml : %w", err)
			return
		}
		cats := map[string]bool{}
		for _, cat := range c.Categories {
			cats[cat.ID] = true
		}
		ids := map[string]bool{}
		for i := range c.Components {
			comp := &c.Components[i]
			switch {
			case comp.ID == "" || comp.Label == "" || comp.Icon == "":
				catalogErr = fmt.Errorf("catalog.yaml : composant n°%d incomplet (id, label, icon)", i+1)
			case ids[comp.ID]:
				catalogErr = fmt.Errorf("catalog.yaml : composant %s en double", comp.ID)
			case !cats[comp.Category]:
				catalogErr = fmt.Errorf("catalog.yaml : %s : catégorie %q inconnue", comp.ID, comp.Category)
			}
			if catalogErr != nil {
				return
			}
			ids[comp.ID] = true
			if comp.Props == nil {
				comp.Props = []CatalogProp{}
			}
			for j := range comp.Props {
				p := &comp.Props[j]
				if p.Options == nil {
					p.Options = []string{}
				}
				if len(p.Options) > 0 && !slices.Contains(p.Options, p.Default) {
					catalogErr = fmt.Errorf("catalog.yaml : %s.%s : défaut hors options", comp.ID, p.ID)
					return
				}
			}
		}
		catalogVal = &c
	})
	return catalogVal, catalogErr
}

// Component renvoie un composant du catalogue par id.
func (c *Catalog) Component(id string) (CatalogComponent, bool) {
	for _, comp := range c.Components {
		if comp.ID == id {
			return comp, true
		}
	}
	return CatalogComponent{}, false
}
