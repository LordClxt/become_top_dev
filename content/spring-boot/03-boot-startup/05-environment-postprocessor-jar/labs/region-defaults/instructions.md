## Contexte

Tixa ouvre aux États-Unis. Selon la région (`tixa.region`), la devise et le fuseau horaire changent. On ne veut pas dupliquer ces valeurs dans chaque fichier de configuration : elles doivent être des **valeurs par défaut** calculées au démarrage, qu'une configuration explicite peut toujours remplacer.

Il faut agir **avant** la création du contexte, pendant que l'environnement se prépare : c'est le rôle d'un `EnvironmentPostProcessor`. `TixaApp` et `application.yml` (`tixa.region: eu`) sont fournis. Tu écris `RegionDefaults.java` et `META-INF/spring.factories`.

## Ta tâche

1. `RegionDefaults` implémente `org.springframework.boot.EnvironmentPostProcessor` (l'interface de Spring Boot 4). Selon `tixa.region` (déjà lue dans `application.yml`, les profils ou la ligne de commande), il ajoute une source de propriétés nommée `tixaRegionDefaults` :

| région | `tixa.currency` | `tixa.time-zone` |
|---|---|---|
| `eu` | `EUR` | `Europe/Paris` |
| `us` | `USD` | `America/New_York` |

2. Cette source passe **après** toutes les sources de configuration (fichiers, profils, environnement, ligne de commande) : n'importe quelle valeur configurée l'emporte.
3. Région inconnue : le démarrage échoue avec `IllegalStateException("région inconnue : mars (connues : eu, us)")`.
4. Enregistre `RegionDefaults` pour que Spring Boot le trouve sans qu'on modifie `TixaApp`.
