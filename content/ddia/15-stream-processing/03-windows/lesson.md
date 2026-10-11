---
id: ddia-ch15-l03
title: "Les quatre types de fenêtres"
source: { chapter: 11, pages: "472-473" }
duration_min: 30
concepts:
  - id: ddia-sp-window-tumbling
    label: "Fenêtre tumbling : durée fixe, sans chevauchement ; chaque événement appartient à exactement une fenêtre (arrondi à la baisse)"
  - id: ddia-sp-window-hopping
    label: "Fenêtre hopping : durée fixe qui avance par pas plus petits ; un événement appartient à taille/pas fenêtres"
  - id: ddia-sp-window-sliding
    label: "Fenêtre sliding : regroupe les événements à moins d'une durée les uns des autres, sans frontières fixes ; tampon trié qu'on purge"
  - id: ddia-sp-window-session
    label: "Fenêtre de session : pas de durée fixe ; un même utilisateur, close après une période d'inactivité"
  - id: ddia-sp-window-state-cost
    label: "Chaque type de fenêtre a un coût en état : un compteur par fenêtre, des sous-agrégats, ou un tampon d'événements"
glossary:
  - term: "fenêtre tumbling (basculante)"
    definition: "Fenêtre de longueur fixe, alignée sur des frontières, sans chevauchement : 10:03:00–10:03:59, puis 10:04:00–10:04:59…"
  - term: "fenêtre hopping (sautante)"
    definition: "Fenêtre de longueur fixe qui avance d'un pas plus petit que sa longueur : les fenêtres se chevauchent."
  - term: "fenêtre sliding (glissante)"
    definition: "Fenêtre qui contient tous les événements situés à moins d'une certaine durée les uns des autres, sans frontières prédéfinies."
  - term: "fenêtre de session"
    definition: "Fenêtre sans durée fixe qui regroupe les événements rapprochés d'un même utilisateur et se ferme après un délai d'inactivité."
  - term: "sessionisation"
    definition: "Découpage de l'activité d'un utilisateur en sessions, courant en analytique web."
visuals: []
labs: [ddia-ch15-l03-lab-windows-design]
xp: 40
---

## Pourquoi c'est important

« Moyenne des 5 dernières minutes » : cette phrase cache un choix. Recalcule-t-on toutes les 5 minutes, ou toutes les minutes ? Deux événements à 10:04:59 et 10:05:01 sont-ils « dans les mêmes 5 minutes » ? Et quand l'utilisateur fait une pause de 2 heures, la « visite » est-elle finie ? Le type de fenêtre répond à ces questions. Se tromper donne des graphiques en dents de scie, des alertes ratées ou des sessions absurdes, et un état qui explose en mémoire.

Dans tout ce qui suit, la fenêtre se calcule sur le **temps de l'événement** (leçon 2) : c'est l'horodatage de l'événement qui décide de sa place, pas l'heure à laquelle le job le voit.

## Tumbling : des cases qui ne se chevauchent pas

Une fenêtre **tumbling** a une **longueur fixe**, et chaque événement appartient à **exactement une** fenêtre. Avec des fenêtres d'une minute : tous les événements de 10:03:00 à 10:03:59 forment une fenêtre, ceux de 10:04:00 à 10:04:59 la suivante, et ainsi de suite.

L'implémentation est triviale : **arrondir l'horodatage à la baisse** au multiple de la taille. En secondes depuis une origine, avec une taille de 60 :

```go
start := t - t%60 // pour t >= 0 ; 10:03:42 -> 10:03:00
end := start + 60 // fenêtre [start, end)
```

L'intervalle est **semi-ouvert** `[start, end)` : un événement à 10:04:00 pile appartient à la fenêtre de 10:04, pas à celle de 10:03. Chaque fenêtre ouverte coûte un **seul agrégat** (un compteur, une somme). C'est la fenêtre des rapports « par minute », « par heure », « par jour ».

Sa limite : les **frontières arbitraires**. Une rafale de 10:02:50 à 10:03:10 est coupée en deux moitiés qui passent chacune sous le seuil d'alerte.

## Hopping : des cases qui se chevauchent

Une fenêtre **hopping** a aussi une longueur fixe, mais elle **avance par pas** plus petits : les fenêtres se **chevauchent**, ce qui **lisse** le résultat. Une fenêtre de 5 minutes avec un pas d'une minute contient 10:03:00–10:07:59, puis 10:04:00–10:08:59, puis 10:05:00–10:09:59…

Un événement appartient alors à **taille / pas** fenêtres : ici, à 5 fenêtres. Un événement à 10:05:30 est dans les fenêtres qui démarrent à 10:01, 10:02, 10:03, 10:04 et 10:05. Formule : la dernière fenêtre commence à `t` arrondi au pas, et l'on recule d'un pas tant que la fenêtre contient encore `t`.

L'implémentation suggérée par le livre : calculer d'abord des **fenêtres tumbling d'une minute** (des sous-agrégats), puis **agréger plusieurs fenêtres adjacentes**. On garde ainsi 5 compteurs par minute au lieu de recopier chaque événement 5 fois. Cela marche pour les agrégats **décomposables** (somme, nombre, min, max) ; pour un percentile exact, il faut des sous-agrégats plus riches, comme des histogrammes.

Une fenêtre tumbling n'est qu'un cas particulier de hopping où le pas égale la longueur.

## Sliding : une fenêtre par distance entre événements

Une fenêtre **sliding** contient tous les événements qui se produisent **à moins d'un certain intervalle les uns des autres**. Avec 5 minutes, un événement à 10:03:39 et un autre à 10:08:12 tombent dans la même fenêtre : moins de 5 minutes les séparent. Des fenêtres tumbling ou hopping de 5 minutes ne les auraient **pas** réunis, car leurs frontières fixes passent entre eux (10:03:39 est dans [10:00, 10:05), 10:08:12 dans [10:05, 10:10)).

Implémentation : garder un **tampon d'événements trié par temps**, et **retirer** les événements trop vieux à mesure que la fenêtre avance. C'est la fenêtre de « au plus 3 tentatives de mot de passe dans n'importe quel intervalle de 5 minutes » : aucune frontière ne peut couper la rafale. Le prix : un état proportionnel au **nombre d'événements** de la fenêtre, pas un simple compteur.

## Session : une fenêtre par utilisateur et par activité

Une fenêtre de **session** n'a **pas de durée fixe**. On regroupe tous les événements d'un **même utilisateur** qui se suivent de près, et la session se termine quand l'utilisateur est **inactif** pendant un certain temps, par exemple **30 minutes** sans événement. La **sessionisation** est un besoin classique de l'analytique web : durée de visite, pages par visite, taux de conversion par session.

Exemple avec un écart de 30 minutes. Clics de Léa : 14:00, 14:10, 14:35, 15:20, 15:30. Écarts : 10, 25, 45, 10 minutes. L'écart de 45 minutes dépasse 30 : deux sessions, {14:00, 14:10, 14:35} et {15:20, 15:30}. La première se ferme à 14:35 + 30 min = 15:05, si aucun événement n'arrive d'ici là.

### Aller plus loin : la fusion de sessions

Avec des événements **dans le désordre**, une session peut devoir être **fusionnée** : si un clic de 14:58 arrive en retard, l'écart passe à 23 et 22 minutes, et les deux sessions de Léa n'en font plus qu'une. Les frameworks (Flink, Beam) implémentent les sessions comme des fenêtres qui commencent à `t` et finissent à `t + gap`, et **fusionnent** celles qui se recouvrent. D'où une règle : une session n'est sûre d'être finie que lorsque le watermark dépasse sa fin, c'est-à-dire le dernier événement + l'écart.

## Combien coûte chaque fenêtre ?

| Fenêtre | Appartenance d'un événement | État typique |
|---|---|---|
| Tumbling | exactement 1 | un agrégat par fenêtre ouverte |
| Hopping | taille / pas | un sous-agrégat par pas, combinés |
| Sliding | dépend des voisins | tous les événements de la durée |
| Session | 1 session par utilisateur | une session ouverte par utilisateur actif |

Avec 1 million d'utilisateurs actifs, des sessions de 30 minutes et des événements lus en flux, l'état de sessionisation pèse 1 million de sessions ouvertes : un ordre de grandeur à vérifier avant le déploiement. On verra en leçon 5 comment cet état survit à une panne.

## Pièges fréquents

- **Oublier l'intervalle semi-ouvert** : un événement à 10:04:00 compté dans deux fenêtres tumbling.
- **Arrondir un horodatage négatif avec `%`** : en Go, `-30 % 60` vaut `-30` ; il faut un arrondi par la division entière inférieure (le projet Tinybase te le fera faire).
- **Recopier chaque événement dans 5 fenêtres hopping** au lieu de combiner des sous-agrégats.
- **Prendre une fenêtre tumbling pour une règle « au plus N en 5 minutes »** : une rafale à cheval sur une frontière passe inaperçue.
- **Fermer une session trop tôt** avec des événements dans le désordre : attendre que le watermark dépasse fin + écart.

## À retenir

- Tumbling : fixe, sans chevauchement, une fenêtre par événement, arrondi à la baisse.
- Hopping : fixe, chevauchante, taille/pas fenêtres par événement, construite à partir de tumbling plus petites.
- Sliding : définie par la distance entre événements, tampon trié qu'on purge.
- Session : par utilisateur, close après une inactivité, durée variable.
- Le choix fixe aussi l'état à garder : un compteur, des sous-agrégats, des événements, ou une session par utilisateur.
