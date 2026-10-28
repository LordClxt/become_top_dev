---
id: arch-ch10-l03
title: "Asynchronisme, erreurs et perte de données"
source: { chapter: 14, pages: "216-222" }
duration_min: 45
concepts:
  - id: arch-responsiveness-vs-performance
    label: "Réactivité (prévenir l'utilisateur que c'est accepté) contre performance (rendre le traitement plus rapide)"
  - id: arch-workflow-event-pattern
    label: "Workflow event pattern : déléguer l'erreur, passer au message suivant, réparer et resoumettre, sinon un tableau de bord humain"
  - id: arch-out-of-order
    label: "Un message réparé est retraité hors séquence : garder l'ordre par contexte avec une file temporaire FIFO"
  - id: arch-data-loss
    label: "Trois points de perte de données et leurs parades : files persistantes + envoi synchrone, acquittement client, ACID + LPS"
glossary:
  - term: "réactivité"
    definition: "Le temps pour que l'utilisateur sache que sa demande est acceptée et sera traitée."
  - term: "workflow event pattern"
    definition: "Pattern d'architecture réactive : le consommateur délègue l'erreur à un processeur de workflow, qui répare et resoumet le message."
  - term: "tableau de bord (dashboard)"
    definition: "Application où une personne voit les messages irréparables automatiquement, les corrige et les resoumet."
  - term: "livraison garantie"
    definition: "Le broker persiste chaque message sur disque : il survit à une panne du broker."
  - term: "envoi synchrone"
    definition: "Le producteur attend que le broker confirme avoir persisté le message."
  - term: "acquittement client"
    definition: "Le message reste dans la file, réservé au consommateur, jusqu'à ce qu'il confirme l'avoir traité (au lieu de l'acquittement automatique)."
  - term: "LPS (last participant support)"
    definition: "Retirer le message de la file persistante seulement après le commit en base, comme dernier participant de la transaction."
visuals: [arch-ch10-data-loss]
labs: [arch-ch10-l03-lab-shares-and-losses]
xp: 45
---

## Pourquoi c'est important

Un utilisateur poste un commentaire sur un produit. Le service de commentaires vérifie les gros mots, la grammaire, le contexte : **3 secondes**. En synchrone, l'utilisateur attend 3,1 s. En asynchrone, il est remercié en **25 ms**. Magique ? Oui, avec une facture : si le commentaire est refusé, comment le dire à quelqu'un qui est déjà parti ? Et si le message se perd entre deux services, qui le saura ?

L'asynchronisme est l'arme principale de l'architecture event-driven. Cette leçon montre ce qu'il apporte vraiment, et les deux problèmes qu'il impose de résoudre : les **erreurs** et la **perte de données**.

## Réactivité n'est pas performance

L'architecture event-driven s'appuie **uniquement** sur l'asynchrone, que ce soit pour du « tire et oublie » (pas de réponse) ou du request-reply (leçon suivante).

Le commentaire, en chiffres :

- **Synchrone** (REST) : 50 ms de latence pour atteindre le service, **3 000 ms** de traitement, 50 ms pour répondre : **3 100 ms** pour l'utilisateur.
- **Asynchrone** (messagerie) : **25 ms** pour l'utilisateur. Le traitement prend toujours 3 025 ms (25 ms de réception + 3 000 ms), mais de son point de vue, c'est fait.

C'est la différence entre **réactivité** et **performance** :

- la **réactivité**, c'est prévenir l'utilisateur que l'action est **acceptée** et sera traitée dans un instant ;
- la **performance**, c'est rendre le traitement de bout en bout **plus rapide** (ici, faire tourner les vérificateurs en parallèle, mettre en cache…).

Rien n'a été optimisé dans le service : il prend toujours 3 000 ms. On a amélioré la **réactivité**, pas la performance.

### Le prix : la gestion d'erreurs

En synchrone, l'utilisateur a la **garantie** que son commentaire est publié. En asynchrone, il n'a qu'un **accusé de réception** et la promesse que ce sera fait. Et s'il y avait un gros mot ? Le commentaire est refusé, et il faut revenir vers l'utilisateur ; ici, c'est possible (il est inscrit, on peut lui écrire). Mais pour un **ordre de bourse** asynchrone, sans moyen de revenir vers lui ? Le principal problème de l'asynchronisme, c'est la **gestion d'erreurs**.

## Le workflow event pattern

C'est un pattern d'**architecture réactive** qui traite à la fois la **résilience** et la **réactivité** : être robuste aux erreurs **sans** dégrader le temps de réponse. Il repose sur **délégation**, **confinement** et **réparation**, grâce à un **délégué de workflow** :

1. Le producteur envoie les données de façon asynchrone au consommateur.
2. Si le consommateur rencontre une erreur, il la **délègue immédiatement** au **processeur de workflow**, et **passe au message suivant**. S'il cherchait lui-même la cause, il ne lirait plus la file, et tous les messages en attente seraient retardés.
3. Le processeur de workflow analyse le message (règles déterministes, voire apprentissage automatique), le **répare** sans intervention humaine, et le **renvoie dans la file d'origine**. Le consommateur le voit comme un nouveau message.
4. S'il ne sait pas réparer, il l'envoie dans une autre file, lue par un **tableau de bord** (une application qui ressemble à une messagerie), sur le poste d'une personne qui corrige à la main et **resoumet** (souvent via l'en-tête `reply-to`).

### Les ordres AAPL

Un conseiller transmet, en lot et de façon asynchrone, des ordres d'achat à une grande société de courtage. Le contrat : `COMPTE,SENS,SYMBOLE,ACTIONS`. Le quatrième ordre du lot est `2WE35HF6DHF,BUY,AAPL,8756 SHARES` : le mot `SHARES` fait échouer la conversion du nombre. Sans gestion d'erreurs, le service de placement ne peut que journaliser : il n'y a personne à qui répondre.

Avec le pattern : le service de placement **délègue** l'ordre fautif au service d'erreurs et **continue** avec le cinquième ordre. Le service d'erreurs voit le problème, **retire `SHARES`**, et **resoumet** l'ordre, qui passe.

### La conséquence : le désordre

Un message réparé est retraité **hors séquence**. Or, pour un même compte, l'ordre compte : une vente d'IBM doit précéder un achat d'AAPL. Une parade : quand un ordre échoue, le service de placement **mémorise son compte** ; tout ordre suivant **du même compte** part dans une **file temporaire** (FIFO). Quand l'ordre fautif est réparé et placé, on **vide la file temporaire** dans l'ordre. Les autres comptes ne sont pas retardés.

### Sous le capot : délégation et ordre par compte

```typescript
type Trade = { account: string; line: string };
const placed: string[] = [], held = new Map<string, Trade[]>();
const parse = (t: Trade) => { const shares = t.line.split(',')[3]!; if (!/^\d+$/.test(shares)) throw new Error('format'); return t.line; };
function onTrade(t: Trade) {
  if (held.has(t.account)) { held.get(t.account)!.push(t); return; }   // même compte qu'un ordre en réparation : on attend
  try { placed.push(parse(t)); } catch { held.set(t.account, []); repair(t); }
}
function repair(t: Trade) {                                             // le délégué de workflow
  placed.push(parse({ ...t, line: t.line.replace(' SHARES', '') }));
  for (const next of held.get(t.account)!) placed.push(parse(next));    // on libère le compte, dans l'ordre
  held.delete(t.account);
}
['A,BUY,AAPL,10', 'B,BUY,AAPL,8756 SHARES', 'C,SELL,IBM,5'].forEach((line) => onTrade({ account: line[0]!, line }));
console.log(placed.map((l) => l.split(',').slice(0, 1)[0]).join(''));
// ABC
```

(Pour la lisibilité, la réparation est ici immédiate ; en réalité elle est asynchrone, et c'est pendant ce délai que la file temporaire du compte se remplit.)

## Empêcher la perte de données

Perdre un message, c'est qu'il ne parvienne jamais à destination. Prenons le cas simple : le processeur A envoie un message dans une file ; le processeur B le prend et l'insère en base. Trois endroits où il peut se perdre :

1. **Entre A et la file** : le message n'arrive jamais, ou le broker tombe avant que B le lise. **Parade** : des **files persistantes** (livraison garantie : le broker écrit le message sur disque, il survit à une panne) et l'**envoi synchrone** (le producteur attend que le broker confirme la persistance). Le message est alors soit encore chez le producteur, soit persisté dans la file : jamais perdu.
2. **B prend le message et plante** avant de le traiter. **Parade** : l'**acquittement client**. Par défaut, un message lu est retiré tout de suite de la file (*acquittement automatique*). En mode client, il **reste** dans la file, réservé à B (son identifiant y est attaché, aucun autre consommateur ne le lit). Si B plante, le message est toujours là.
3. **B n'arrive pas à écrire en base** (erreur de données). **Parade** : une **transaction ACID** et le **commit** en base ; avec le **LPS** (*last participant support*), le message n'est retiré de la file persistante qu'**après** le commit, en confirmant que le traitement est fini et persisté.

Ensemble, ces techniques garantissent qu'aucun message ne se perd entre A et la base.

::visual{id="arch-ch10-data-loss"}

## Pièges fréquents

- **Vendre de la performance** quand on a amélioré la réactivité.
- **Passer en asynchrone sans canal de retour** vers l'utilisateur pour les erreurs.
- **Laisser le consommateur chercher la cause d'une erreur** : toute la file attend.
- **Resoumettre sans se soucier de l'ordre** quand l'ordre compte (même compte, même dossier).
- **L'acquittement automatique** sur des messages importants : un crash après la lecture les perd.

## À retenir

- **Réactivité** (3 100 → 25 ms) ≠ **performance** (le service prend toujours 3 000 ms).
- L'asynchronisme se paie en **gestion d'erreurs**.
- **Workflow event pattern** : déléguer, passer au suivant, réparer et resoumettre, sinon **tableau de bord** humain.
- Un message réparé arrive **hors séquence** : une **file temporaire FIFO par contexte** (compte) préserve l'ordre.
- Trois pertes possibles, trois parades : **files persistantes + envoi synchrone**, **acquittement client**, **ACID + LPS**.
