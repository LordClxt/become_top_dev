## Contexte

Helpdesk tourne sur Grails 7. Un agent ferme un ticket, l'écran affiche « Fermé »… et le lendemain le ticket est de nouveau ouvert. Personne ne l'a rouvert : la fermeture n'a jamais atteint la base. Même chose pour l'assignation et la réouverture.

Le service fait simplement, dans une transaction :

```groovy
Ticket.get(id).close()   // pas de save() : GORM écrit les objets modifiés au commit
```

C'est l'usage normal de GORM : au commit, Hibernate écrit les propriétés **marquées comme modifiées**. Les tests reproduisent ce scénario sur un vrai GORM 7 (Hibernate 5.6 + H2 en mémoire).

## À faire (fichier `Ticket.groovy`)

1. Corrige `close()`, `reopen()` et `assign(String)` pour que leurs modifications soient **détectées et enregistrées**. Garde leur logique :
   - `close()` : statut `CLOSED`, `closedAt` = maintenant ;
   - `reopen()` : statut `OPEN`, `closedAt` remis à `null`, `reopenCount` augmenté de 1 ;
   - `assign(agent)` : `assignee` = agent, et un ticket `OPEN` passe `IN_PROGRESS`.
2. Ajoute une propriété **calculée** `summary` : `"#12 Imprimante en panne [CLOSED]"`. Elle ne doit **pas** devenir une colonne en base.

## Ce que vérifient les tests

Chaque test exécute l'action dans une transaction, puis relit le ticket dans une **nouvelle session** : seule la valeur réellement écrite en base compte.
