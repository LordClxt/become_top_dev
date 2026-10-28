**Le sélecteur sur le CID trie la file de réponse** : chaque demandeur ne lit que la réponse à sa requête, et une réponse orpheline (CID 499) reste dans la file sans tromper personne. À 8 000 requêtes par seconde, c'est aussi la technique qui ménage le broker.

Côté quanta, l'asynchronisme ne suffit pas à séparer : le request-reply soude A et B, la base partagée soude B et C ; seul D, qui ne fait qu'écouter avec sa propre base, forme un second quantum.
