## Contexte

En développement, Tixa doit utiliser une banque factice ; en production, la vraie, qui exige son URL. L'environnement de recette (« staging ») est une copie de la production, mais branchée sur la région `us` de la banque. Aujourd'hui, les deux banques existent en même temps et l'application ne démarre pas.

`BankClient` est fourni. Tu modifies `FakeBank.java`, `LiveBank.java` et `application.yml`.

## Ta tâche

| profils demandés | banque | région |
|---|---|---|
| aucun | `factice` | `eu` |
| `prod` | `live` (URL obligatoire) | `eu` |
| `staging` | `live` | `us` |
| `us` | `factice` | `us` |

- `staging` est un **groupe** : l'activer active `prod` et `us`, dans cet ordre.
- Le profil `us` change seulement la région (`tixa.bank.region`), dans un document de `application.yml`.
- En production sans `tixa.bank.url`, le démarrage doit **échouer**, jamais basculer en silence sur la banque factice.
