---
id: ddia-ch17-l01
title: "L'argument de bout en bout pour les bases de données"
source: { chapter: 12, pages: "515-519" }
duration_min: 35
concepts:
  - id: ddia-correct-exactly-once
    label: "Exécution « exactement une fois » : en cas d'échec, l'effet final doit être celui d'une seule exécution"
  - id: ddia-correct-dedup-layers
    label: "TCP, les transactions et le 2PC dédupliquent chacun leur maillon, pas la requête de l'utilisateur"
  - id: ddia-correct-operation-id
    label: "Identifiant d'opération généré par le client, conservé tout au long du chemin et contrôlé par une contrainte d'unicité"
  - id: ddia-correct-end-to-end-argument
    label: "Argument de bout en bout : une garantie ne peut être complète qu'aux extrémités ; les couches basses n'offrent qu'une optimisation"
  - id: ddia-correct-app-level-fault-tolerance
    label: "Les transactions ne suffisent pas : la correction de bout en bout se construit dans l'application, avec des abstractions à inventer"
glossary:
  - term: "exactement une fois (exactly-once, effectively-once)"
    definition: "Garantie que l'effet d'une opération est appliqué une seule fois, même si l'opération a été tentée ou livrée plusieurs fois."
  - term: "suppression des doublons (duplicate suppression)"
    definition: "Mécanisme qui reconnaît une requête déjà traitée et ne la ré-applique pas."
  - term: "identifiant d'opération (request ID, idempotency key)"
    definition: "Valeur unique, choisie à l'origine de la requête, qui permet à chaque étape de reconnaître un doublon."
  - term: "argument de bout en bout (end-to-end argument)"
    definition: "Principe de Saltzer, Reed et Clark (1984) : une fonction ne peut être réalisée complètement et correctement qu'avec l'aide de l'application aux extrémités du système."
  - term: "idempotence"
    definition: "Propriété d'une opération dont la répétition a le même effet qu'une seule exécution."
visuals: []
labs: [ddia-ch17-l01-lab-dedup-design]
xp: 40
---

## Pourquoi c'est important

Un virement de 11 € qui part deux fois, c'est 22 € qui manquent au client. Pas une latence un peu haute, pas une page un peu lente : une **donnée fausse**, qui le restera tant que personne ne la corrige à la main. Tout le livre t'a donné des briques (transactions, consensus, logs, flux) ; cette leçon pose la question qui reste quand on les assemble : **qui garantit, au final, qu'une action de l'utilisateur ne produit qu'un seul effet ?** Réponse inconfortable : aucune de ces briques à elle seule. Il faut raisonner **de bout en bout**.

## Exactement une fois, ou plutôt « effectivement une fois »

Au chapitre sur le traitement de flux, tu as vu la garantie *exactly-once* : si quelque chose échoue en cours de route, le système relance le travail, mais l'effet final doit être **celui d'une seule exécution**. Ni perte (le message n'aurait pas été traité), ni doublon (il l'aurait été deux fois).

Traiter un message deux fois, c'est une forme de corruption de données. Facturer deux fois un client, incrémenter deux fois un compteur : l'état n'est plus le reflet de ce qui s'est passé. Le moyen le plus robuste d'obtenir « exactement une fois » est de rendre l'opération **idempotente** : la rejouer ne change rien. Mais idempotente n'est pas un état naturel. Il faut du travail, en général des **métadonnées** (quel identifiant a déjà été appliqué ?) et une gestion soigneuse de la reprise après panne (le *fencing* vu avec les verrous et les baux).

## Chaque couche déduplique… son propre maillon

Le réflexe est de penser que la pile s'en charge. Regardons-la couche par couche.

- **TCP** numérote ses paquets : il retire les doublons et remet les paquets en ordre **dans une connexion**. Si la connexion tombe, ses garanties s'arrêtent là.
- **La transaction** de la base : le client envoie `COMMIT`, et la connexion coupe avant la réponse. Le client ne sait pas si la transaction a été validée. S'il se reconnecte et rejoue, il risque de l'exécuter deux fois. La base, elle, ne voit qu'une nouvelle transaction sur une nouvelle connexion.
- **Le commit à deux phases** (2PC) casse justement le lien 1 transaction = 1 connexion : un coordinateur peut finir le travail après une coupure. Mais il ne protège qu'entre le serveur d'application et les bases.

Il reste le maillon le plus fragile : **l'utilisateur**. Il clique « Payer » dans son navigateur, le réseau du métro décroche, la page tourne puis affiche une erreur. Il recharge, le navigateur demande s'il veut renvoyer le formulaire, il dit oui. Pour le serveur web, c'est une **nouvelle requête HTTP**, sur une nouvelle connexion, qui ouvrira une **nouvelle transaction**. Aucune des couches ci-dessous ne peut savoir que c'est la même intention.

Exemple : la transaction ci-dessous déplace 11 € du compte 1234 vers le compte 4321. Elle est parfaitement atomique. Et pourtant, rejouée deux fois, elle déplace 22 €.

```sql
BEGIN TRANSACTION;
UPDATE accounts SET balance = balance + 11.00 WHERE account_id = 1234;
UPDATE accounts SET balance = balance - 11.00 WHERE account_id = 4321;
COMMIT;
```

## L'identifiant d'opération

Pour reconnaître un doublon, il faut une identité qui **traverse toutes les couches**, du clic jusqu'au disque. Les identifiants de transaction ou de connexion ne conviennent pas : ils naissent trop bas. La solution est de **générer un identifiant unique côté client**, par exemple un UUID placé dans un champ caché du formulaire (ou un hachage des champs du formulaire), et de le faire voyager avec la requête jusqu'à la base. Là, on l'enregistre avec une **contrainte d'unicité** :

```sql
ALTER TABLE requests ADD UNIQUE (request_id);

BEGIN TRANSACTION;
INSERT INTO requests (request_id, from_account, to_account, amount)
  VALUES ('0286FDB8-D7E1-423F-B40B-792B3608036C', 4321, 1234, 11.00);
UPDATE accounts SET balance = balance + 11.00 WHERE account_id = 1234;
UPDATE accounts SET balance = balance - 11.00 WHERE account_id = 4321;
COMMIT;
```

Si la même requête revient, l'`INSERT` viole la contrainte, la transaction est annulée, et l'argent ne bouge pas une seconde fois. Le serveur peut alors renvoyer le résultat de la première exécution.

Deux remarques importantes :

- la **contrainte d'unicité est la pièce qui porte la garantie**. Sans elle (ou avec une vérification « SELECT puis INSERT » en isolation faible), deux exécutions concurrentes peuvent toutes deux constater l'absence de l'identifiant : c'est le *write skew* du chapitre sur l'isolation ;
- la table `requests` n'est pas un détail : c'est un **journal d'événements**. Les mises à jour de soldes pourraient en être **dérivées** plus tard, par un processeur en aval. On retrouve l'idée d'*event sourcing* et du chapitre précédent : l'événement est la source de vérité, l'état en est une vue.

## L'argument de bout en bout

Ce raisonnement porte un nom. En 1984, Saltzer, Reed et Clark l'ont formulé pour les réseaux : une fonction ne peut être réalisée **complètement et correctement** qu'avec la connaissance et l'aide de l'application **aux extrémités** du système. La fournir comme service d'une couche intermédiaire est donc impossible ; une version **incomplète** peut parfois servir, mais seulement comme **optimisation de performance**.

L'article prend d'autres exemples que la déduplication :

- **l'intégrité des données** : Ethernet, TCP et TLS ont chacun des sommes de contrôle sur les paquets. Elles détectent un octet abîmé sur le câble, pas un bug du logiciel qui envoie ou qui reçoit, ni un secteur de disque corrompu. Seule une somme de contrôle calculée par l'émetteur et vérifiée par le destinataire final couvre tout le chemin ;
- **le chiffrement** : le mot de passe du Wi-Fi protège des voisins, pas du reste d'Internet. TLS protège du réseau, pas d'un serveur compromis. Seul un chiffrement de bout en bout couvre tout.

Les couches basses restent utiles : grâce à TCP, les doublons sont rares et l'application n'a presque jamais à s'en soucier. Mais « rares » n'est pas « jamais ».

## Appliquer l'idée aux systèmes de données

Conséquence directe : même une base parfaitement sérialisable ne dispense pas l'application de ses propres mesures de bout en bout. La transaction est une abstraction formidable, qui a réduit des myriades de problèmes (concurrence, pannes, coupures de disque) à deux issues : validée ou annulée. Mais elle ne voit qu'un morceau du chemin, et elle coûte cher dès qu'elle doit traverser plusieurs machines (le chapitre sur le consensus l'a montré).

Kleppmann en tire une piste : chercher des **abstractions de tolérance aux pannes** qui fournissent facilement la correction de bout en bout propre à une application, tout en restant performantes dans un système distribué. Les leçons suivantes en dessinent une : des requêtes identifiées, écrites une fois dans un log, d'où tout le reste est dérivé de façon déterministe.

### Aller plus loin : les clés d'idempotence en pratique

Plusieurs API de paiement exposent exactement ce mécanisme : un en-tête `Idempotency-Key` choisi par le client. Le serveur mémorise la réponse associée à la clé pendant une durée donnée (souvent 24 h) ; un renvoi avec la même clé reçoit la même réponse, et un renvoi avec la même clé mais un **contenu différent** est refusé, car c'est le signe d'un bug côté client. Ce n'est pas dans le livre, mais c'est l'argument de bout en bout appliqué à une API publique.

## Pièges fréquents

- **Compter sur TCP ou sur la transaction pour éviter les doublons** : ils ne voient pas le renvoi de formulaire ni la reprise après un délai dépassé.
- **Générer l'identifiant sur le serveur** : chaque nouvel essai en reçoit un nouveau, donc aucun doublon n'est jamais reconnu. L'identifiant naît là où naît l'intention.
- **Vérifier l'existence avec un `SELECT` avant l'`INSERT`** sans contrainte d'unicité : deux essais concurrents passent tous les deux.
- **Confondre idempotent et sans effet** : l'opération a bien un effet, mais une seule fois.
- **Réutiliser un identifiant pour une requête différente** : la deuxième sera ignorée silencieusement.

## À retenir

- Un effet appliqué deux fois est une donnée corrompue ; « exactement une fois » s'obtient en rendant l'opération idempotente.
- TCP, la transaction et le 2PC dédupliquent chacun leur maillon ; aucun ne relie le clic de l'utilisateur à l'écriture finale.
- Un identifiant d'opération généré par le client, transmis partout et protégé par une contrainte d'unicité, déduplique **de bout en bout**.
- Argument de bout en bout : une garantie complète se construit aux extrémités ; les couches basses ne sont qu'une optimisation.
- Les transactions restent précieuses, mais la correction de bout en bout est une responsabilité de l'application.
