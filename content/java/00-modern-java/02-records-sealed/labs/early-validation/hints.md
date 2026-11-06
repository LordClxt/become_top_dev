## Hint 1
Le constructeur d'`Entity` s'exécute pendant l'appel `super()`. Tout ce qui est fait **après** `super()` dans `Account` arrive trop tard pour `describe()`.

## Hint 2
Depuis Java 25, un constructeur peut contenir des instructions **avant** `super()` : valider des paramètres, calculer des variables locales, et affecter ses propres champs `final` (qui n'ont pas d'initialiseur).

## Hint 3
Normalise dans une variable locale (`var normalized = iban.replace(" ", "").toUpperCase(Locale.ROOT);`), valide-la, affecte `this.iban = normalized;` et `this.owner = …;`, puis seulement `super();`. Tu ne peux ni lire `this.iban` ni appeler une méthode d'instance avant `super()`.
