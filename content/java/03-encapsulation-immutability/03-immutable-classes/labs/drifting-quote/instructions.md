## Le ticket

> **#4127. Montant du devis incohérent.** Plusieurs clients B2B signalent que le devis qu'ils ont reçu par mail ne correspond plus au devis affiché dans leur espace, quelques minutes plus tard. Parfois le montant a augmenté, parfois des lignes ont été ajoutées. Un client voit apparaître « Cadeau : stylo » deux, trois, quatre fois. Aucune erreur dans les logs. Le code de calcul du total n'a pas changé depuis un an.

Un devis émis est un engagement commercial : une fois émis, il **ne doit plus jamais changer**, quoi que fasse le client avec son panier ensuite et quel que soit le nombre d'affichages.

## Ta mission

Les tests décrivent le comportement attendu. Trouve **toutes** les causes racines, dans n'importe lequel des cinq fichiers, et corrige-les **dans la conception** : le panier doit continuer à fonctionner (ajout, changement de quantité), et l'affichage doit continuer à montrer le cadeau.

Avant de corriger, écris pour toi-même, cause par cause : quel objet est partagé, entre qui, et qui le modifie.
