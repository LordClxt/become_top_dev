## Contexte

`OrdersService` appelle `PaymentsService` pour encaisser une commande, et `PaymentsService` rappelle `OrdersService` pour marquer une commande remboursée. Les deux modules s'importent l'un l'autre, et les deux fichiers aussi : l'application ne démarre pas.

La correction « rapide » consiste à mettre des `forwardRef()` des deux côtés. Ici, elle est interdite : tu dois **supprimer** le cycle.

## Le contrat à conserver

| Route | Effet |
|---|---|
| `GET /orders/:id` | la commande (`pending`, `paid` ou `refunded`), 404 si inconnue |
| `POST /orders/:id/pay` | enregistre un paiement, la commande passe à `paid` |
| `GET /payments` | la liste des paiements |
| `POST /payments/:orderId/refund` | rembourse le paiement ouvert, la commande passe à `refunded` ; 422 s'il n'y a rien à rembourser |

## Contraintes

- Ni `forwardRef` ni `ModuleRef` dans ton code : le test les cherche.
- Le graphe des modules doit être acyclique. Tu peux ajouter un fichier (`ledger.ts` est prévu pour ça) et un module.
- Pas de `@Global()` pour masquer le problème.
- Dans ton rendu, explique en deux ou trois phrases **pourquoi** le cycle existait, et ce que ton découpage dit du domaine.
