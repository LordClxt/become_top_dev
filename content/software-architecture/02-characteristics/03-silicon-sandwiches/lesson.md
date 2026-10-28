---
id: arch-ch02-l03
title: "Kata : Silicon Sandwiches"
source: { chapter: 5, pages: "89-96" }
duration_min: 45
concepts:
  - id: arch-scalability-vs-elasticity
    label: "Scalabilité (beaucoup d'utilisateurs simultanés) vs élasticité (absorber des rafales)"
  - id: arch-integration-fragility
    label: "Un point d'intégration ne doit pas rendre le système fragile : dégrader plutôt que tomber"
  - id: arch-overspecify
    label: "Sur-spécifier les caractéristiques est aussi nuisible que les sous-spécifier"
  - id: arch-char-arch-vs-design
    label: "Une caractéristique peut se traiter par l'architecture (microkernel) ou par le design (Template Method)"
  - id: arch-eliminate-one
    label: "Exercice : quelle caractéristique éliminerais-tu en premier ?"
glossary:
  - term: "scalabilité"
    definition: "Capacité à servir un grand nombre d'utilisateurs ou de requêtes simultanés sans dégradation sérieuse."
  - term: "élasticité"
    definition: "Capacité à absorber des rafales de trafic, en ajoutant puis retirant des ressources."
  - term: "customizability"
    definition: "Capacité à adapter le comportement (promotions locales, recettes, itinéraires) selon le lieu ou le client."
  - term: "architecture sacrificielle"
    definition: "Architecture volontairement simple, conçue pour être remplacée quand le besoin aura grandi."
  - term: "Ivory Tower Architect"
    definition: "Anti-pattern : l'architecte décide seul, loin de l'équipe qui implémente."
visuals: [arch-ch02-scale-vs-elastic]
labs: [arch-ch02-l03-lab-scale-or-elastic, arch-ch02-l03-lab-noon-outage]
xp: 45
---

## Pourquoi c'est important

« Il n'y a pas de mauvaises réponses en architecture, seulement des réponses chères. » (Mark Richards). Cette leçon déroule un kata complet, exactement comme on le ferait en atelier, pour voir **comment** un architecte passe d'un énoncé métier à une courte liste de caractéristiques, et où se cachent les pièges : les rafales de midi, un service de cartographie qui tombe, et l'envie de tout spécifier.

## L'énoncé

**Description** : une chaîne nationale de sandwicheries veut permettre la commande en ligne (en plus de la commande par téléphone).

**Utilisateurs** : des milliers, peut-être un jour des millions.

**Exigences** :
1. L'utilisateur passe commande, reçoit une heure de retrait et l'itinéraire vers la boutique (intégration avec plusieurs services de cartographie externes incluant le trafic).
2. Si la boutique livre, envoyer un livreur avec le sandwich.
3. Accessible sur mobile.
4. Promotions nationales du jour.
5. Promotions locales du jour.
6. Paiement en ligne, sur place ou à la livraison.

**Contexte additionnel** : les boutiques sont des **franchises** avec chacune son propriétaire ; la maison mère prévoit de s'étendre **à l'étranger** ; l'objectif est d'embaucher une main-d'œuvre **bon marché**.

L'architecte ne conçoit pas tout le système : il cherche ce qui **influence la conception**, surtout la structure. Il trie en explicites et implicites.

## Les caractéristiques explicites

### Les utilisateurs : scalabilité… et élasticité

« Des milliers, un jour des millions » : la **scalabilité** est en tête de liste, bien que l'énoncé ne prononce jamais le mot. L'architecte doit souvent **décoder** le langage du domaine.

Mais il faut probablement aussi de l'**élasticité**. Les deux sont souvent confondues ; elles ont des contraintes différentes :

- **Scalabilité** : tenir la performance quand le nombre d'utilisateurs **simultanés** augmente, durablement.
- **Élasticité** : absorber des **rafales**, puis revenir à la normale.

Un système de **réservation d'hôtel** est scalable sans être élastique : hors événement, la charge est régulière. Une **billetterie de concert** doit être élastique : à l'ouverture des ventes, les fans déferlent. Souvent, un système élastique doit aussi être scalable.

Les exigences ne parlent pas de rafales. Mais une sandwicherie a-t-elle un trafic régulier dans la journée ? Évidemment non : il y a **le midi**. Un bon architecte voit cette caractéristique cachée dans le domaine.

### Sous le capot : la même capacité, deux charges

```typescript
// 6 instances × 100 commandes/min chacune ; une file de 200 commandes au plus.
function simulate(load: number[], capacity = 600, maxQueue = 200) {
  let queue = 0, rejected = 0;
  for (const arrivals of load) {
    queue += arrivals;
    queue = Math.max(0, queue - capacity);
    if (queue > maxQueue) { rejected += queue - maxQueue; queue = maxQueue; }
  }
  return rejected;
}
const steady = Array(60).fill(500);                           // 30 000 commandes, régulières
const lunch = [...Array(50).fill(300), ...Array(10).fill(1500)]; // 30 000 aussi, dont un pic
console.log(simulate(steady), simulate(lunch));
// 0 8800
```

Même volume total, même capacité : zéro rejet dans un cas, **8 800 commandes perdues** dans l'autre. Dimensionner pour la moyenne, c'est dimensionner pour la scalabilité ; le midi exige de l'élasticité (ou une capacité payée toute la journée pour dix minutes de pic). Le projet archkit de ce module fait de cette simulation un vrai outil, avec percentiles et autoscaling.

### Exigence par exigence

1. **Cartographie externe** : un point d'intégration touche la **fiabilité** : si l'appel échoue, la commande échoue-t-elle ? L'architecte doit se méfier de la sur-spécification. Si le service de trafic tombe, faut-il que le site tombe… ou qu'il donne un itinéraire un peu moins bon ? Il faut **éviter de construire de la fragilité** dans la conception : le trafic est un plus, pas une condition.
2. **Livraison** : aucune caractéristique particulière.
3. **Mobile** : surtout un sujet de design. Vu le budget et la simplicité de l'application, plusieurs applications natives seraient excessives : une **application web adaptée au mobile**, avec des exigences de **performance** (temps de chargement des pages). À décider **avec** les designers et le métier, pas seul.
4. et 5. **Promotions nationales et locales** (et l'itinéraire, adapté à l'adresse) : de la **personnalisation** (*customizability*). Un style **microkernel** (module 08) s'y prête bien : comportement par défaut dans le cœur, variantes locales dans des plug-ins. Mais un design classique peut aussi s'en charger avec le pattern **Template Method**.
6. **Paiement** : implique de la sécurité, mais rien au-delà de l'implicite.
7. **Franchises** : contraintes de **coût** ; vérifier la **faisabilité** (budget, temps, compétences), peut-être une architecture simple, voire **sacrificielle**.
8. **Expansion à l'étranger** : de l'**internationalisation** (i18n), qui se traite par le design sans structure particulière.
9. **Main-d'œuvre bon marché** : l'**utilisabilité** comptera, mais c'est du design plus que de l'architecture.

Enfin, la **performance** : personne n'achète dans une boutique en ligne lente, surtout aux heures de pointe. Elle se définit **avec** la scalabilité : une performance de référence sans charge, et un niveau acceptable à un nombre d'utilisateurs donné. Les caractéristiques se définissent souvent les unes par rapport aux autres.

## Les caractéristiques implicites

- **Disponibilité** : que le site soit accessible.
- **Fiabilité** : qu'il ne coupe pas les sessions en pleine commande.
- **Sécurité** : implicite partout, mais pas forcément une caractéristique d'**architecture**. Ici, si le paiement est confié à un prestataire, une bonne hygiène suffit (pas de numéro de carte en clair, ne pas stocker plus que nécessaire) : aucune structure spéciale.

> **Sur-spécifier est aussi nuisible que sous-spécifier** : cela complique toute la conception.

## Architecture ou design ?

La **personnalisation** est-elle une caractéristique d'architecture ? Normalement, elle relève du design. Mais si une partie du domaine **exige une structure** pour la supporter, elle passe du côté de l'architecture. Deux options :

- **Microkernel** : la structure porte la personnalisation (cœur + plug-ins).
- **Template Method** : une classe parente définit le déroulé, les sous-classes surchargent les étapes locales.

Laquelle ? **Ça dépend** : y a-t-il de bonnes raisons (performance, couplage) d'éviter le microkernel ? Les autres caractéristiques sont-elles plus difficiles dans l'une ou l'autre option ? Combien coûte chaque option pour tenir **toutes** les caractéristiques ? Et surtout : la décision se prend **avec** les développeurs, le chef de projet, les ops. Décider seul, c'est l'anti-pattern **Ivory Tower Architect**.

## L'exercice qui clarifie tout : en éliminer une

Une fois la première liste établie, demande-toi : **si je devais en éliminer une, laquelle ?** On élimine plus volontiers une **explicite** (les implicites portent le succès général). Pour Silicon Sandwiches, pas de réponse unique, mais deux candidates :

- la **personnalisation**, qu'on peut confier au design de l'application ;
- la **performance** : parmi les caractéristiques opérationnelles, c'est la moins critique. Il ne s'agit pas de faire une application lente, mais de ne pas la prioriser devant la scalabilité ou la disponibilité.

::visual{id="arch-ch02-scale-vs-elastic"}

## Pièges fréquents

- **Confondre scalabilité et élasticité** : dimensionner pour la moyenne alors que le domaine a des pics.
- **Rendre critique une intégration optionnelle** : si le trafic est un bonus, sa panne ne doit pas bloquer la commande.
- **Lister la sécurité comme caractéristique d'architecture par réflexe** : avec un prestataire de paiement, c'est de l'hygiène.
- **Trancher architecture vs design seul** : l'Ivory Tower Architect.

## À retenir

- Décode le domaine : « des millions » → **scalabilité** ; « le midi » → **élasticité**.
- Une intégration externe ne doit pas rendre le système **fragile** : prévois la dégradation.
- **Sur-spécifier = sous-spécifier** : chaque caractéristique complique les autres.
- Une même préoccupation peut se traiter par l'**architecture** (microkernel) ou le **design** (Template Method) : c'est un trade-off à trancher **en équipe**.
- Demande-toi toujours **laquelle éliminer** : la réponse révèle ce qui est vraiment critique.
