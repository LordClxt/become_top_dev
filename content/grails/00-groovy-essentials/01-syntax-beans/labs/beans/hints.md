## Hint 1
Déclarer un champ sans modificateur (`BigDecimal price`) génère un getter et un setter. Si tu écris toi-même `void setPrice(BigDecimal p)`, Groovy utilise le tien. Dans ce setter, écris `this.@price = p` pour affecter le champ **sans** repasser par le setter.

## Hint 2
Un getter `String getLabel()` suffit à créer la propriété `label` : `p.label` appelle `getLabel()`. Une GString `"${name} (${price} €)"` fait le travail.

## Hint 3
`@ToString(includeNames = true)` (paquet `groovy.transform`) produit presque le format attendu : il liste aussi les propriétés calculées (comme `label`). Regarde l'option `excludes`. Pour `parse`, `line.split(':')` donne un tableau ; `*.trim()` nettoie chaque morceau ; `'3.50' as BigDecimal` convertit.
