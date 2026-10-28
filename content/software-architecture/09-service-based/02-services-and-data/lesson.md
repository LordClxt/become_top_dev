---
id: arch-ch09-l02
title: "Services de domaine et données"
source: { chapter: 13, pages: "187-191" }
duration_min: 45
concepts:
  - id: arch-sb-service-design
    label: "Un service de domaine : façade d'API + métier + persistance (en couches) ou sous-domaines (modulaire)"
  - id: arch-sb-facade-orchestration
    label: "La façade orchestre la requête en interne, là où des microservices l'orchestreraient entre services"
  - id: arch-sb-acid
    label: "Transactions ACID dans un service à gros grain, contre BASE et cohérence à terme entre services fins"
  - id: arch-sb-tradeoff
    label: "Le prix du gros grain : tester tout le service et prendre plus de risque à chaque déploiement"
  - id: arch-sb-entity-libs
    label: "Partitionnement logique de la base et bibliothèques d'entités fédérées ; la bibliothèque unique est le pire choix"
glossary:
  - term: "façade d'API"
    definition: "Point d'entrée d'un service de domaine, qui orchestre en interne une requête métier."
  - term: "transaction ACID"
    definition: "Atomique, cohérente, isolée, durable : tout est validé (commit) ou tout est annulé (rollback)."
  - term: "BASE"
    definition: "Basic availability, Soft state, Eventual consistency : la technique des transactions distribuées entre services fins."
  - term: "objet entité"
    definition: "Classe qui représente une table de la base (et parfois son SQL)."
  - term: "bibliothèque d'entités fédérée"
    definition: "Une bibliothèque d'entités par domaine logique de la base, utilisée seulement par les services de ce domaine."
visuals: [arch-ch09-expired-card]
labs: [arch-ch09-l02-lab-table-change-impact, arch-ch09-l02-lab-paid-not-reserved]
xp: 45
---

## Pourquoi c'est important

Un client passe commande ; sa carte est expirée. Dans un monolithe, la transaction est annulée, le client reçoit un message, rien n'a bougé. Découpe la même opération en trois microservices (Commande, Paiement, Stock), et la question devient vertigineuse : la commande est déjà insérée, le paiement échoue… et le stock ? Faut-il l'avoir déjà décrémenté ? Réservé ? Pour qui, si un autre client veut le dernier article ?

Le style service-based doit une bonne part de son pragmatisme à une propriété simple : ses services sont **assez gros** pour garder ce genre d'opération **dans une seule transaction**. Cette leçon montre pourquoi, ce que cela coûte, et comment éviter que la base partagée ne devienne un piège.

## La conception d'un service de domaine

Un service de domaine étant à gros grain, il se conçoit en général :

- **en couches** : une **façade d'API**, une couche **métier**, une couche de **persistance** ;
- ou **par sous-domaines**, à la manière d'un monolithe modulaire.

Dans tous les cas, il expose une **façade d'API** avec laquelle l'interface interagit.

### La façade orchestre en interne

La façade prend en charge l'**orchestration** de la requête métier. Exemple : « passer commande » (*catalog checkout*). Reçue par la façade du service **Commande**, cette unique requête orchestre **en interne** : créer la commande, générer son identifiant, appliquer le paiement, mettre à jour le stock de chaque produit.

En microservices, la même requête orchestrerait **plusieurs services distants** à usage unique. Cette différence entre orchestration **interne, au niveau des classes**, et orchestration **externe, entre services**, résume l'écart de granularité entre les deux styles.

## ACID dans le service, BASE entre les services

Parce que les services sont à gros grain, on utilise des **transactions ACID** classiques (commit, rollback) pour garantir l'intégrité **à l'intérieur** d'un service. Les styles très distribués, aux services fins, s'appuient sur des transactions **BASE** et la **cohérence à terme** : ils n'offrent pas le même niveau d'intégrité.

Reprends la carte expirée :

- **Service-based** : la commande, le paiement et le stock sont dans la **même transaction** du service Commande. La carte est refusée ? **Rollback** : tout ce qui a été écrit disparaît, on prévient le client.
- **Microservices** : `OrderPlacement` accepte la requête, crée la commande, génère son identifiant, l'insère. Puis il appelle à distance `PaymentService`, qui refuse la carte. La commande existe déjà, sans approbation : **données incohérentes**. Et le stock ? Décrémenté ? Réservé ? Et si un autre client veut le dernier article pendant ce temps ? Autant de questions à résoudre quand on orchestre un processus sur plusieurs services fins (le module 10 et la suite du livre y reviendront avec les sagas).

### Sous le capot : ce que garantit un rollback

```typescript
const db = { orders: [] as string[], stock: new Map([['sku-1', 1]]) };
function placeOrder(card: { expired: boolean }) {
  const snapshot = { orders: [...db.orders], stock: new Map(db.stock) };   // début de transaction
  try {
    db.orders.push('order-1');
    db.stock.set('sku-1', db.stock.get('sku-1')! - 1);
    if (card.expired) throw new Error('carte expirée');                    // le paiement échoue
    return 'commande passée';
  } catch (e) {
    db.orders = snapshot.orders; db.stock = snapshot.stock;                 // rollback
    return (e as Error).message;
  }
}
console.log(placeOrder({ expired: true }), db.orders.length, db.stock.get('sku-1'));
// carte expirée 0 1
```

Après l'échec, il n'y a ni commande fantôme ni stock perdu. Une vraie base le fait pour toi ; le projet archkit de ce module écrit ce mécanisme en mémoire, puis la façade de commande par-dessus.

### Le prix du gros grain

Ce n'est pas gratuit. Modifier la prise de commande dans `OrderService` oblige à **tester tout le service**, paiement compris ; en microservices, le changement ne toucherait que le petit `OrderPlacement`, sans changer `PaymentService`. Et comme on déploie **plus de code**, le risque de casser quelque chose (le paiement, par exemple) est plus grand ; un microservice à responsabilité unique a moins de chances de casser autre chose.

## Partitionner la base

Les services partagent en général une base monolithique. Le risque : un **changement de schéma** mal géré peut toucher **tous** les services, d'où un coût énorme en effort et en coordination.

### La pire option : une bibliothèque d'entités unique

Les classes qui représentent les tables (les **objets entités**, parfois avec leur SQL) vivent dans une **bibliothèque partagée** (JAR, DLL, paquet npm interne) utilisée par les services. En faire **une seule** bibliothèque pour tout est **la façon la moins efficace** de faire du service-based : tout changement de table modifie la bibliothèque, donc oblige à **modifier et redéployer chaque service**, qu'il utilise ou non la table. Le versionnement aide un peu, mais il reste difficile de savoir quels services sont vraiment touchés sans une analyse manuelle détaillée.

### La bonne option : des bibliothèques fédérées

On **partitionne logiquement** la base par domaines (`common`, `customer`, `invoicing`, `order`, `tracking`) et on matérialise ce partitionnement par **autant de bibliothèques** d'entités. Un changement de table dans le domaine `invoicing` ne touche que `invoicing_entities_lib`, donc seulement les services qui l'utilisent (ici, le service de facturation). Les autres ne bougent pas.

Reste le domaine **commun** (`common_entities_lib`), utilisé par tous : un changement exige de coordonner tous les services. Parade : **verrouiller** ces entités communes dans le gestionnaire de versions, avec un droit de modification réservé à l'**équipe base de données**. Cela contrôle le changement et souligne son importance.

> Rends le partitionnement logique de la base **aussi fin que possible**, tout en gardant des domaines de données bien définis.

::visual{id="arch-ch09-expired-card"}

## Pièges fréquents

- **Faire orchestrer deux services par l'interface** pour une opération qui devrait être atomique : on perd l'ACID (c'est l'enquête de cette leçon).
- **Une bibliothèque d'entités unique** : chaque migration redéploie tout.
- **Laisser n'importe qui modifier les entités communes.**
- **Oublier le prix du gros grain** : un service plus gros se teste et se déploie plus lourdement.

## À retenir

- Service de domaine : **façade d'API** + métier + persistance, ou sous-domaines ; la façade **orchestre en interne**.
- **ACID dans le service** (rollback de la carte expirée) contre **BASE entre services fins** (commande fantôme, stock incertain).
- Le prix : **tester tout le service**, **plus de risque** par déploiement.
- Base : **partitionnement logique** + **bibliothèques d'entités fédérées** ; entités **communes verrouillées** ; la bibliothèque unique est le pire choix.
