## Énoncé

Les vues GSP de Grails remplacent des expressions `${…}` par des valeurs du modèle. Tu écris le moteur minimal de **Minigrails** : `Tpl.render(String template, Map model, Map filters = [:])`.

### Syntaxe à gérer

| Gabarit | Sens |
|---|---|
| `${user.name}` | chemin pointé, résolu dans des maps **ou** des objets (propriétés) |
| `${user.nick ?: anonyme}` | valeur par défaut (texte brut, espaces autour ignorés) |
| `${user.name\|upper\|trim}` | filtres appliqués de gauche à droite |
| `${user.nick ?: anonyme\|upper}` | défaut appliqué **avant** les filtres |
| `\${x}` | échappement : produit le texte `${x}` tel quel |

### Règles

1. Un maillon `null` ou absent donne une valeur absente (jamais de `NullPointerException`). Une valeur absente sans défaut s'affiche comme une chaîne vide.
2. Le défaut s'applique **seulement** si la valeur est `null` ou une chaîne blanche. `0`, `false` et `[]` sont des valeurs légitimes : ils s'affichent (`0`, `false`, `[]`). Attention à la vérité Groovy !
3. Filtres fournis d'office : `upper`, `lower`, `trim`, `capitalize`. La map `filters` ajoute des filtres (nom → closure à un paramètre) ou **remplace** ceux d'office.
4. Un filtre inconnu lève `IllegalArgumentException` dont le message contient son nom.
5. Le résultat d'une expression peut contenir `$` ou `\` : il doit apparaître tel quel.
