---
id: ddia-ch10-l05
title: Modèles de système, sûreté et vivacité
source:
  chapter: 8
  pages: 310-312
duration_min: 40
concepts:
- id: ddia-timing-models
  label: 'Modèles de temps : synchrone (bornes connues), partiellement synchrone (borné la plupart du temps), asynchrone (aucune hypothèse d''horloge)'
- id: ddia-node-models
  label: 'Modèles de nœud : crash-stop, crash-recovery (disque conservé, mémoire perdue), byzantin'
- id: ddia-realistic-model
  label: Le modèle réaliste combine temps partiellement synchrone et nœuds crash-recovery
- id: ddia-correctness-properties
  label: Un algorithme est correct s'il satisfait ses propriétés (unicité, monotonie, disponibilité) dans un modèle donné
- id: ddia-safety-liveness
  label: 'Sûreté (rien de mauvais n''arrive : violation datable et irréversible) contre vivacité (quelque chose de bon finit par arriver : « finalement
    »)'
- id: ddia-model-vs-reality
  label: 'Le modèle simplifie la réalité (disque qui oublie, bug de firmware) : preuves théoriques ET tests empiriques'
glossary:
- term: modèle de système
  definition: Abstraction des hypothèses de temps et de pannes sous lesquelles un algorithme est prouvé correct.
- term: crash-stop
  definition: Un nœud défaillant s'arrête pour toujours.
- term: crash-recovery
  definition: Un nœud peut redémarrer ; son stockage durable est conservé, sa mémoire est perdue.
- term: sûreté (safety)
  definition: Aucun mal ne se produit ; si violée, on peut dater le moment et le mal est fait.
- term: vivacité (liveness)
  definition: Quelque chose de bon finit par se produire ; ne peut pas être violée à un instant donné.
visuals: []
labs:
- ddia-ch10-l05-lab-models-design
extra: false
xp: 40
---

## Pourquoi c'est important

Toute la leçon précédente tient en une phrase : tout peut mal tourner. Comment concevoir un algorithme face à une liste de cauchemars sans fin ? Les chercheurs ont une méthode : **écrire noir sur blanc ce qu'on suppose** et **ce qu'on veut garantir**, puis prouver que le second découle du premier. C'est la notion de **modèle de système**.

## Modèles de temps

- **Synchrone** : délais réseau, pauses de processus et dérive d'horloge ont des **bornes connues**. Pratique pour raisonner, mais irréaliste.
- **Partiellement synchrone** : le système se comporte comme un système synchrone **la plupart du temps**, mais parfois dépasse les bornes (réseau congestionné, pause longue, horloge qui s'emballe). C'est un **modèle réaliste**.
- **Asynchrone** : aucune hypothèse de temps, pas même d'horloge, donc pas de timeouts. Très restrictif : beaucoup de problèmes y deviennent impossibles à résoudre (module 12).

## Modèles de nœuds

- **Crash-stop** : un nœud défaillant plante et ne revient jamais.
- **Crash-recovery** : un nœud peut tomber puis **redémarrer** ; on suppose qu'il a un **stockage durable** qui survit et que sa **mémoire** est perdue. Cela décrit mieux la réalité.
- **Byzantin** : un nœud peut faire n'importe quoi, y compris tromper les autres.

Le modèle le plus utile en pratique associe **temps partiellement synchrone** et **nœuds crash-recovery**. Un algorithme conçu pour lui reste correct même si les hypothèses de temps sont brièvement violées, car il ne dépend pas du temps pour la **sûreté**.

## Définir ce qu'est « correct »

Un algorithme est correct s'il satisfait ses **propriétés**. Pour les jetons de clôture du verrou :

- **Unicité** : deux requêtes ne renvoient jamais le même jeton.
- **Monotonie** : si la requête x précède la requête y, le jeton de x est plus petit.
- **Disponibilité** : un nœud qui demande un jeton et ne plante pas finit par recevoir une réponse.

## Sûreté et vivacité

Ces propriétés se rangent en deux familles :

- **Sûreté** (*safety*) : « rien de mauvais n'arrive ». Si une propriété de sûreté est violée, on peut **désigner le moment** où elle l'a été, et on ne peut pas revenir en arrière (si l'unicité est violée, on sait quelle requête a produit le doublon).
- **Vivacité** (*liveness*) : « quelque chose de bon finit par arriver ». Elle contient souvent le mot **finalement** (*eventually*), et on ne peut jamais dire qu'elle est violée à un instant donné, car la réponse peut arriver plus tard. D'où le nom de **cohérence à terme** (*eventual consistency*) : c'est une propriété de vivacité.

La distinction a un usage concret : pour les modèles à temps variable, on exige que la **sûreté soit toujours vraie**, même si tous les nœuds plantent ou que le réseau est coupé, et on n'accepte de conditionner la **vivacité** qu'à des hypothèses (par exemple : « la réponse arrive, à condition que le réseau finisse par se rétablir »).

## Un modèle n'est pas la réalité

Les modèles sont des **abstractions** : l'hypothèse « le stockage durable survit au redémarrage » est fausse si le disque est corrompu, ou si un bug de firmware perd des données. Un algorithme prouvé dans un modèle peut donc quand même échouer en pratique. Les deux démarches se complètent : la **preuve** garantit qu'on a pensé à tous les cas du modèle, les **tests empiriques** (injection de pannes, simulation déterministe) attrapent les cas que le modèle ignore. Et si on peut éviter le distribué, on reste sur une seule machine.

## Pièges fréquents

- **Concevoir sans écrire le modèle** : on ne sait pas dire quand l'algorithme est faux.
- **Confondre sûreté et vivacité** : « finalement cohérent » n'interdit aucune lecture périmée à un instant donné.
- **Supposer un seul modèle de panne** : crash-stop n'est pas crash-recovery.
- **Se reposer uniquement sur la preuve** : elle ne couvre pas un firmware buggé.

## À retenir

- Modèle = hypothèses de temps (synchrone, partiellement synchrone, asynchrone) + hypothèses de pannes (crash-stop, crash-recovery, byzantin).
- Le plus réaliste : partiellement synchrone et crash-recovery.
- Sûreté = jamais de mal ; vivacité = du bien finit par arriver.
- Preuve et tests se complètent ; le modèle ne couvre pas toute la réalité.
