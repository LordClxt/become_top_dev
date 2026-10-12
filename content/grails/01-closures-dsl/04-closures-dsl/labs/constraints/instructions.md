## Contexte

Tu reconstruis, en petit, le mécanisme du bloc `static constraints = { … }` de GORM. Le fichier `Validator.groovy` a deux méthodes à écrire. Lis bien le commentaire de chacune : il contient toutes les règles.

## `Validator.build(Closure spec)`

Reçoit un DSL :

```groovy
def v = Validator.build {
    name blank: false, size: 2..10
    age  range: 0..150, nullable: true
    role inList: ['admin', 'user']
}
```

Il faut un **builder** (une petite classe à toi) qui reçoit les appels `name(...)`, `age(...)`, `role(...)`. Fixe-le comme `delegate` de la closure, avec `DELEGATE_FIRST`, puis exécute la closure. Les contraintes inconnues sont refusées tout de suite.

## `validate(Map data)`

Renvoie la liste des codes d'erreur (`"age.range"`, `"name.nullable"`…), dans l'ordre de déclaration des champs. Les règles sont dans le commentaire du fichier : par défaut un champ n'est **pas** nullable, `blank` ne concerne que les chaînes, `matches` doit couvrir toute la valeur.

## Piège

Dans une closure passée à `each`, `return` ne sort que de cette exécution de la closure : tu t'en serviras (volontairement) pour « passer au champ suivant ».
