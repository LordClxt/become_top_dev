## Contexte

Brainfuck est un langage à huit instructions, célèbre pour être minuscule et illisible. C'est aussi le meilleur terrain d'entraînement pour du contrôle de flux : une boucle d'exécution, un `switch` d'instructions, des sauts imbriqués, un pointeur à surveiller. Tu écris l'interpréteur.

## Le langage

Une **bande** de 30 000 cases d'un octet (initialisées à 0) et un **pointeur** qui commence à la case 0.

| Instruction | Effet |
|---|---|
| `>` / `<` | déplace le pointeur d'une case à droite / à gauche |
| `+` / `-` | ajoute / retire 1 à la case courante, **sur 8 bits avec retour** (255 + 1 = 0, 0 − 1 = 255) |
| `.` | écrit la case courante en sortie |
| `,` | lit le prochain octet de l'entrée dans la case courante (0 quand l'entrée est épuisée) |
| `[` | si la case vaut 0, saute après le `]` correspondant |
| `]` | si la case ne vaut pas 0, revient après le `[` correspondant |

Tout autre caractère est un **commentaire**, ignoré.

## Ta mission

Dans `bf.go`, implémente :

```go
func Run(program string, input []byte, maxSteps int) ([]byte, error)
```

Elle renvoie les octets écrits par `.`.

### Erreurs

| Erreur | Quand |
|---|---|
| `ErrUnbalanced` | un `[` sans `]` ou l'inverse. **Vérifié avant toute exécution** : aucune sortie n'est produite. |
| `ErrPointer` | le pointeur sort de la bande (avant la case 0 ou après la case 29 999) |
| `ErrSteps` | le programme dépasse `maxSteps` |

**Compte des étapes :** chaque instruction exécutée compte pour une étape, crochets compris, chaque passage dans une boucle comptant à nouveau. Les commentaires ne coûtent rien. L'étape numéro `maxSteps + 1` déclenche `ErrSteps`. C'est ce qui empêche `+[]` de bloquer ton programme pour toujours.

En cas d'erreur **d'exécution** (`ErrPointer`, `ErrSteps`), renvoie quand même la sortie produite jusque-là.

## Conseils d'architecture

- Précalcule une table qui associe chaque crochet à son correspondant (avec une pile) : sauter devient instantané, et tu détectes les crochets mal appariés avant d'exécuter.
- Une boucle `for` sur le compteur d'instruction avec un `switch` sur le caractère est le cœur de l'interpréteur. Les commentaires passent par un `continue`.
- Les cases sont des `byte` : l'arithmétique avec retour est gratuite.
