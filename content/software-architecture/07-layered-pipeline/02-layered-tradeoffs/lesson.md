---
id: arch-ch07-l02
title: "Couches : puits, usages et notes"
source: { chapter: 10, pages: "158-161" }
duration_min: 35
concepts:
  - id: arch-layered-starting-point
    label: "Un bon point de départ quand le style final n'est pas connu, à condition de limiter la réutilisation et les hiérarchies profondes"
  - id: arch-sinkhole
    label: "Anti-pattern du puits : des requêtes qui traversent les couches sans logique ; règle des 80/20"
  - id: arch-layered-when
    label: "Quand l'utiliser : petites applications, budget et délais serrés, exigences encore floues"
  - id: arch-layered-ratings
    label: "Notes : coût et simplicité forts ; déployabilité, testabilité, élasticité, scalabilité, performance faibles ; pas de tolérance aux pannes"
glossary:
  - term: "puits d'architecture (sinkhole)"
    definition: "Anti-pattern : une requête traverse les couches en simple relais, sans logique métier, au prix d'instanciations et de traitements inutiles."
  - term: "règle des 80/20"
    definition: "20 % de requêtes en puits, c'est acceptable ; 80 %, c'est le signe que le style ne convient pas."
  - term: "MTTR"
    definition: "Mean Time To Recovery : temps moyen de rétablissement après une panne. Un monolithe qui met 2 à 15 minutes à démarrer a un MTTR élevé."
  - term: "profondeur d'héritage"
    definition: "Nombre de niveaux d'une hiérarchie de classes ; à garder faible pour préserver la modularité."
visuals: []
labs: [arch-ch07-l02-lab-sinkhole-audit, arch-ch07-l02-lab-broken-screen]
xp: 35
---

## Pourquoi c'est important

« Afficher le nom et l'adresse du client » : la présentation appelle le métier, qui appelle les règles, qui appellent la persistance, qui fait un `SELECT`. Puis tout remonte, sans qu'aucune couche n'ait rien calculé, agrégé ni vérifié. Quatre objets instanciés, quatre appels, pour un relais pur. Une fois, ce n'est rien. Sur 80 % des requêtes, c'est le signe que tu as choisi le mauvais style. Cette leçon apprend à mesurer ce signe, et donne le bulletin de notes complet du style en couches.

## Un bon point de départ… sous conditions

L'architecture en couches est un bon **point de départ** quand on ne sait pas encore quel style s'imposera. C'est une pratique courante dans les projets microservices où l'architecte n'a pas encore décidé si les microservices sont le bon choix, mais où il faut commencer à développer. Deux conditions pour garder la porte ouverte :

- **limiter la réutilisation** au minimum ;
- garder des **hiérarchies d'objets peu profondes** (faible profondeur d'héritage).

Ces deux précautions préservent la modularité et facilitent le passage à un autre style plus tard.

## L'anti-pattern du puits

Le **puits d'architecture** (*architecture sinkhole*) : des requêtes qui passent de couche en couche en **simple relais**, sans logique métier dans aucune. Résultat : des instanciations et des traitements inutiles, qui pèsent sur la **mémoire** et la **performance**.

Toute architecture en couches a des puits. La question est leur **proportion**. La **règle des 80/20** :

- **20 %** de requêtes en puits : acceptable ;
- **80 %** : c'est le signe que l'architecture en couches **n'est pas** le bon style pour ce domaine.

Une autre parade : **ouvrir toutes les couches**, en sachant le prix : le changement devient bien plus difficile à maîtriser (on perd l'isolation).

### Sous le capot : mesurer le puits

```typescript
// Pour chaque requête, les couches qui ont fait un vrai travail (calcul, règle, agrégation, transformation).
const requests: Record<string, string[]> = {
  'GET /customer': [],
  'GET /orders': [],
  'POST /order': ['business', 'persistence'],
  'GET /invoice': ['business'],
  'GET /catalog': [],
};
const sinkholes = Object.values(requests).filter((work) => work.length === 0).length;
console.log(`${Math.round((sinkholes / Object.keys(requests).length) * 100)} % de puits`);
// 60 % de puits
```

En production, on obtient cette mesure en marquant les méthodes qui ne font que déléguer, ou en instrumentant chaque couche. Une tendance qui grimpe vers 80 % dit que le domaine s'est éloigné de ce que le style sait faire.

## Quand l'utiliser

- Pour de **petites** applications ou sites **simples**.
- Comme point de départ quand le **budget et les délais** sont très serrés : simplicité et familiarité en font l'un des styles **les moins coûteux**.
- Quand l'architecte **analyse encore** les besoins et ne sait pas quel style conviendra.

Mais à mesure que l'application grossit, **maintenabilité**, **agilité**, **testabilité** et **déployabilité** se dégradent. Les grandes applications seront souvent mieux servies par un style plus modulaire.

## Le bulletin de notes

Le livre note chaque style de 1 à 5 étoiles par caractéristique. Pour les couches :

- **Coût global et simplicité** : les **points forts**. Monolithique, sans la complexité du distribué, simple à comprendre, peu coûteux à construire et maintenir. Attention : ces notes fondent à mesure que le monolithe grossit.
- **Déployabilité** : **très faible**. La cérémonie, le risque et la rareté des déploiements : une modification de **trois lignes** oblige à redéployer toute l'unité, avec les changements de base, de configuration et de code qui s'y glissent, et elle est livrée avec des dizaines d'autres changements, ce qui augmente encore le risque.
- **Testabilité** : **faible** (deux étoiles). Personne ne relance des heures de non-régression pour trois lignes. Une étoile de plus parce qu'on peut bouchonner un composant, voire une couche entière.
- **Fiabilité** : **moyenne** (trois étoiles) : pas de trafic réseau, de bande passante ni de latence à gérer, mais un déploiement monolithique, des tests incomplets et des déploiements risqués.
- **Élasticité et scalabilité** : **très faibles** (une étoile). Faire monter en charge une fonction plus qu'une autre demande multithreading, messagerie interne, parallélisme : des techniques auxquelles le style ne se prête pas. Et l'architecture en couches est toujours **un seul quantum** (interface, traitement et base monolithiques) : elle ne monte en charge que jusqu'à un certain point.
- **Performance** : **faible** (deux étoiles) : pas de traitement parallèle, des couches fermées, des puits. Caching et multithreading aident, mais il faut se battre.
- **Tolérance aux pannes** : **aucune**. Une petite partie qui provoque un dépassement de mémoire fait tomber toute l'application. Et la **disponibilité** souffre d'un **MTTR** élevé : de **2 minutes** de démarrage pour une petite application à **15 minutes ou plus** pour une grosse.

## Pièges fréquents

- **Partir en couches « pour commencer »** puis réutiliser à outrance et hériter sur cinq niveaux : la sortie devient impossible.
- **Ignorer la proportion de puits** jusqu'à ce que la performance s'effondre.
- **Ouvrir toutes les couches** pour tuer les puits sans mesurer la perte d'isolation.
- **Promettre élasticité ou tolérance aux pannes** avec ce style.

## À retenir

- **Point de départ** valable, avec peu de réutilisation et des hiérarchies plates.
- **Puits** : 20 % acceptable, **80 % = mauvais style** ; ouvrir les couches est une parade coûteuse.
- Pour : **petit, simple, budget serré, besoins flous**. Contre : tout ce qui grossit.
- Notes : **coût et simplicité** forts ; **déployabilité, élasticité, scalabilité** très faibles ; testabilité et performance faibles ; fiabilité moyenne ; **pas de tolérance aux pannes**, MTTR de 2 à 15 minutes ; **un seul quantum**.
