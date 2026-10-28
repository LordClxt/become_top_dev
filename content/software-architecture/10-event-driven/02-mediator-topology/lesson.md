---
id: arch-ch10-l02
title: "La topologie médiateur"
source: { chapter: 14, pages: "205-215" }
duration_min: 45
concepts:
  - id: arch-mediator-components
    label: "Topologie médiateur : file d'événements initiateurs, médiateur, canaux dédiés (files point à point), processeurs qui répondent au médiateur"
  - id: arch-mediator-implementations
    label: "Implémentations : code (Camel, Mule, Spring Integration), BPEL (ODE, Oracle), BPM (jBPM, humains), et le modèle de délégation"
  - id: arch-mediator-recovery
    label: "Le médiateur connaît le workflow : il attend les acquittements, arrête sur erreur, persiste l'état et reprend là où il s'est arrêté"
  - id: arch-commands-vs-events
    label: "Commandes (à traiter) contre événements (qu'on peut ignorer)"
  - id: arch-broker-vs-mediator
    label: "Choisir : contrôle du workflow et gestion d'erreurs contre performance et scalabilité"
glossary:
  - term: "médiateur d'événements"
    definition: "Composant qui connaît les étapes d'un flux, envoie les commandes aux processeurs et coordonne leurs réponses."
  - term: "file d'événements initiateurs"
    definition: "File dans laquelle arrivent les événements initiateurs, consommée par le médiateur."
  - term: "BPEL"
    definition: "Business Process Execution Language : langage (proche du XML) qui décrit des flux complexes, avec gestion d'erreurs et redirections."
  - term: "BPM"
    definition: "Business Process Management : moteur de processus longs avec intervention humaine (jBPM)."
  - term: "commande"
    definition: "Message qui dit ce qui doit se passer (place-order) : il doit être traité."
  - term: "événement"
    definition: "Message qui dit ce qui s'est passé (order-created) : on peut l'ignorer."
visuals: [arch-ch10-broker-vs-mediator]
labs: [arch-ch10-l02-lab-broker-or-mediator]
xp: 45
---

## Pourquoi c'est important

En topologie broker, quand Payment plante, personne ne le sait, et personne ne peut relancer la commande là où elle s'est arrêtée. Pour certains workflows (une commande payée, un ordre de bourse, un dossier d'assurance), c'est inacceptable. La topologie **médiateur** répond à ces faiblesses en confiant le workflow à un composant qui le **connaît**. Elle a ses propres prix, et choisir entre les deux est l'une des décisions clés d'une architecture événementielle.

## Les composants

Au centre, un **médiateur d'événements**, qui gère et contrôle le workflow des événements initiateurs qui demandent de coordonner plusieurs processeurs. Les composants :

- l'**événement initiateur** démarre le processus, comme en broker ;
- il arrive dans une **file d'événements initiateurs**, consommée par le **médiateur** ;
- le médiateur **ne connaît que les étapes** du traitement : il génère les événements de traitement correspondants et les envoie sur des **canaux dédiés** (en général des **files**, en **point à point**) ;
- les **processeurs** écoutent leur canal, traitent, et **répondent au médiateur** qu'ils ont terminé. Contrairement au broker, ils **n'annoncent pas** ce qu'ils ont fait au reste du système.

La plupart des implémentations ont **plusieurs médiateurs**, en général un par domaine ou groupe d'événements : un médiateur **client** (inscription, mise à jour du profil), un médiateur **commande** (ajout au panier, passage en caisse). Cela réduit le point unique de défaillance et augmente le débit.

## Quel médiateur ?

L'implémentation dépend de la complexité des événements :

- **Simple** (orchestration et gestion d'erreurs simples) : **Apache Camel**, **Mule ESB**, **Spring Integration**. Les routes de messages s'écrivent en **code**.
- **Difficile** (beaucoup de conditions, plusieurs chemins dynamiques, gestion d'erreurs complexe) : un moteur **BPEL** comme **Apache ODE** ou **Oracle BPEL Process Manager**. Puissant, mais complexe à apprendre ; on le dessine souvent avec des outils graphiques.
- **Complexe** (transactions **longues** avec **intervention humaine**) : un moteur **BPM** comme **jBPM**. Exemple : un ordre de bourse dépasse un certain nombre d'actions ; le médiateur doit s'arrêter, demander l'approbation d'un trader senior, et **attendre**.

Se tromper coûte cher : Camel pour des flux longs avec intervention humaine serait extrêmement difficile à écrire et maintenir ; un moteur BPM pour des flux simples ferait perdre des **mois** là où Camel aurait suffi en quelques **jours**.

### Le modèle de délégation

Comme il est rare que tous les événements aient la même complexité, le livre recommande de les **classer** en **simples**, **difficiles** ou **complexes**, et de les faire **tous** passer par un **médiateur simple** (Camel, Mule). Celui-ci examine la classe de l'événement : il le traite lui-même s'il est simple, ou le **transfère** au médiateur BPEL ou BPM adapté. Il peut rester responsable de savoir quand l'événement est terminé, ou déléguer tout le workflow (notification du client comprise).

## La commande, en médiateur

Même exemple qu'en broker. L'événement `PlaceOrder` arrive dans la `customer-event-queue` ; le **médiateur client** connaît les étapes :

1. **Créer la commande** : il envoie `create-order` dans la file `order-placement`. OrderPlacement valide, crée, et renvoie un acquittement **avec l'identifiant**.
2. **En parallèle** : `email-customer`, `apply-payment`, `adjust-inventory`, chacun dans sa file. Le médiateur **attend les trois acquittements** avant de passer à l'étape 3. Si l'un échoue, il peut prendre des mesures correctives.
3. **En parallèle** : `fulfill-order` et `order-stock`.
4. `email-customer` (« votre commande est prête ») et `ship-order`.
5. `email-customer` (« votre commande est expédiée »). Le workflow est terminé : le médiateur marque le flux comme fini et **supprime l'état** associé.

Les étapes s'enchaînent **en série**, les tâches d'une même étape **en parallèle** : on ne prévient pas le client que sa commande est prête (étape 4) avant que la préparation (étape 3) soit faite et acquittée.

### Ce que le médiateur sait faire

Parce qu'il **contrôle** le workflow, le médiateur peut garder l'**état** de l'événement et gérer **erreurs**, **reprise** et **redémarrage**. La carte expirée : le médiateur reçoit l'erreur du paiement ; il sait que la commande ne peut pas être préparée (étape 3) tant que le paiement n'est pas appliqué ; il **arrête** le workflow et **enregistre l'état** dans son propre stockage persistant. Quand le paiement est finalement appliqué, le workflow **redémarre là où il s'était arrêté** : au début de l'étape 3, sans refaire les étapes 1 et 2.

### Sous le capot : un médiateur qui reprend

```typescript
type Step = string[];                       // une étape = des tâches lancées en parallèle
const workflow: Step[] = [['create-order'], ['email', 'payment', 'inventory'], ['fulfill', 'order-stock'], ['email', 'ship'], ['email']];
const state = { step: 0 };                  // persisté dans un vrai médiateur
function run(fails: (task: string) => boolean) {
  for (; state.step < workflow.length; state.step++) {
    const failed = workflow[state.step]!.filter(fails);
    if (failed.length > 0) return `arrêt à l'étape ${state.step + 1} (${failed.join(', ')})`;
  }
  return 'terminé';
}
console.log(run((t) => t === 'payment'), '|', run(() => false));
// arrêt à l'étape 2 (payment) | terminé
```

La seconde exécution reprend à l'étape 2 (l'étape en échec), pas au début. Le projet archkit de ce module écrit un médiateur complet, qui ne relance que les tâches non acquittées.

## Commandes ou événements

Une différence de sens importante :

- En **broker**, les événements de traitement disent ce qui **s'est passé** : `order-created`, `payment-applied`, `email-sent`. Ce sont des **événements** ; on peut les **ignorer**.
- En **médiateur**, les messages disent ce qui **doit se passer** : `place-order`, `send-email`, `fulfill-order`. Ce sont des **commandes** ; elles **doivent** être traitées.

## Le revers du médiateur

- Il est **très difficile** de modéliser de façon déclarative le traitement **dynamique** d'un flux complexe. Beaucoup de médiateurs ne gèrent donc que le chemin général, et l'on combine médiateur et broker en **hybride** pour les cas dynamiques (rupture de stock, erreurs atypiques).
- Les processeurs montent en charge comme en broker, mais le **médiateur doit monter en charge aussi** : il devient parfois un **goulot d'étranglement**.
- Les processeurs sont **moins découplés**, et la **performance** est moindre, puisque le médiateur contrôle tout.

| Avantages | Inconvénients |
|---|---|
| Contrôle du workflow | Processeurs plus couplés |
| Gestion d'erreurs | Scalabilité moindre |
| Reprise (recoverability) | Performance moindre |
| Capacité de redémarrage | Tolérance aux pannes moindre |
| Meilleure cohérence des données | Modéliser des workflows complexes |

> Le choix entre broker et médiateur se résume à un trade-off : **contrôle du workflow et gestion d'erreurs** contre **performance et scalabilité**.

::visual{id="arch-ch10-broker-vs-mediator"}

## Pièges fréquents

- **Un médiateur unique pour tout** : point de défaillance et goulot.
- **Le mauvais moteur** : Camel pour des processus humains longs, ou BPM pour des flux simples.
- **Des processeurs qui publient à tout le monde** en topologie médiateur : on mélange les deux modèles sans le décider.
- **Ne pas persister l'état** du médiateur : on perd justement la capacité de reprise qui justifiait son coût.

## À retenir

- Médiateur : **file d'événements initiateurs** → **médiateur** → **files dédiées** → processeurs qui **répondent au médiateur** ; plusieurs médiateurs, par domaine.
- Implémentations : **code** (Camel, Mule, Spring Integration), **BPEL** (ODE, Oracle), **BPM** (jBPM) ; **délégation** depuis un médiateur simple.
- Il **attend les acquittements**, **arrête** sur erreur, **persiste l'état** et **reprend** à l'étape en échec.
- **Commandes** (à traiter) contre **événements** (ignorables).
- Choix : **contrôle et erreurs** (médiateur) contre **performance et scalabilité** (broker), ou un **hybride**.
