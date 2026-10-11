---
id: ddia-ch04-l01
title: "Compatibilité, encodage et formats textuels"
source: { chapter: 4, pages: "111-116" }
duration_min: 35
concepts:
  - id: ddia-rolling-upgrade
    label: "Mise à jour progressive : l'ancien et le nouveau code, les anciennes et les nouvelles données coexistent"
  - id: ddia-backward-forward
    label: "Rétrocompatibilité (nouveau code lit l'ancien format) et compatibilité ascendante (ancien code lit le nouveau)"
  - id: ddia-encoding-decoding
    label: "Encoder, c'est passer d'une structure en mémoire à une suite d'octets, et décoder l'inverse"
  - id: ddia-language-specific-formats
    label: "Les formats propres à un langage (pickle, Serializable) enferment dans le langage, ouvrent des failles et vieillissent mal"
  - id: ddia-textual-formats
    label: "JSON, XML et CSV : lisibles et répandus, mais flous sur les nombres et les chaînes binaires"
glossary:
  - term: "rolling upgrade (staged rollout)"
    definition: "Déployer une nouvelle version sur quelques nœuds à la fois, vérifier qu'elle fonctionne, puis continuer ; permet des mises en production sans interruption."
  - term: "rétrocompatibilité (backward compatibility)"
    definition: "Un code plus récent sait lire des données écrites par un code plus ancien."
  - term: "compatibilité ascendante (forward compatibility)"
    definition: "Un code plus ancien sait lire des données écrites par un code plus récent."
  - term: "encodage (sérialisation, marshalling)"
    definition: "Traduction d'une structure en mémoire vers une suite d'octets autonome. L'inverse s'appelle décodage."
  - term: "MessagePack"
    definition: "Encodage binaire de JSON : il garde le modèle de données JSON, donc les noms de champs sont inclus dans les octets."
visuals: []
labs: [ddia-ch04-l01-lab-compat-design]
xp: 35
---

## Pourquoi c'est important

Une application change tout le temps : nouveau champ, nouveau type d'enregistrement, nouvelle façon d'afficher les données. Or tu ne peux pas tout changer d'un coup. Pendant le déploiement, l'ancien code et le nouveau tournent **en même temps**, et la base contient des données écrites par les deux. Cette leçon donne le vocabulaire de cette cohabitation, et explique pourquoi le choix d'un format d'encodage est une décision d'architecture, pas un détail technique.

## Plusieurs versions en même temps

Quand le format des données change, le code qui les lit change aussi. Mais dans une grosse application, le code ne change pas instantanément :

- côté **serveur**, on fait une **mise à jour progressive** (*rolling upgrade*, *staged rollout*) : la nouvelle version est déployée sur quelques nœuds à la fois, on vérifie qu'elle tourne bien, puis on avance. Pas d'interruption, donc des mises en production plus fréquentes ;
- côté **client**, tu es à la merci de l'utilisateur, qui n'installera la mise à jour que plus tard.

Anciennes et nouvelles versions du code, anciens et nouveaux formats de données, **coexistent**. Pour que le système continue de fonctionner, il faut une compatibilité dans les deux sens :

- **rétrocompatibilité** (*backward*) : le **nouveau** code lit les données écrites par l'**ancien** code. En général facile : tu connais le format ancien, tu le gères explicitement.
- **compatibilité ascendante** (*forward*) : l'**ancien** code lit les données écrites par le **nouveau** code. Plus délicate : il faut que l'ancien code **ignore** ce que la nouvelle version a ajouté.

> Moyen mnémotechnique : *backward* regarde en arrière vers les anciennes données ; *forward* anticipe les futures.

## Encoder et décoder

Un programme manipule les données sous (au moins) deux formes :

1. **en mémoire** : objets, structures, listes, tableaux, tables de hachage, arbres, avec des pointeurs, optimisés pour le CPU ;
2. **en octets** : pour écrire dans un fichier ou envoyer par le réseau, il faut une suite d'octets autonome (par exemple un document JSON). Un pointeur n'a aucun sens pour un autre processus.

La traduction de la mémoire vers les octets est l'**encodage** (aussi *sérialisation*, *marshalling*) ; l'inverse est le **décodage** (*parsing*, *désérialisation*). Attention : le mot « sérialisation » désigne aussi, dans le chapitre sur les transactions, quelque chose de tout autre (l'isolation sérialisable). Ce cours dit **encodage**. Et encoder n'a rien à voir avec chiffrer.

## Les formats propres à un langage

Beaucoup de langages offrent un encodage intégré : `java.io.Serializable`, `Marshal` en Ruby, `pickle` en Python (ou `encoding/gob` en Go). C'est commode : une ligne de code suffit à sauvegarder un objet. Mais les problèmes sont profonds :

- l'encodage est **lié à un langage** : lire ces données depuis un autre langage est très difficile, et tu t'engages pour très longtemps ;
- pour restaurer les objets, le décodeur doit pouvoir **instancier des classes arbitraires** : c'est une source classique de failles (si un attaquant fait décoder des octets de son choix, il peut exécuter du code à distance) ;
- le **versionnement** est un après-coup : ces bibliothèques négligent la compatibilité ;
- l'**efficacité** aussi (la sérialisation intégrée de Java est réputée lente et volumineuse).

Règle : n'utilise l'encodage de ton langage que pour des usages très temporaires.

## JSON, XML, CSV et leurs variantes binaires

Pour échanger entre langages, JSON et XML s'imposent : très connus, très supportés, presque aussi détestés (XML est jugé verbeux et compliqué ; JSON doit sa popularité à son support natif dans les navigateurs et à sa simplicité). CSV est un autre format répandu, moins puissant. Ce sont des formats **textuels**, donc à peu près lisibles par un humain. Ils ont des défauts subtils :

- **Les nombres sont ambigus.** En XML et en CSV, on ne distingue pas un nombre d'une chaîne composée de chiffres (sauf avec un schéma externe). JSON distingue chaînes et nombres, mais pas entiers et flottants, et ne précise aucune précision. Les entiers au-delà de 2⁵³ ne tiennent pas exactement dans un flottant à double précision : en JavaScript, ils deviennent inexacts. Twitter, dont les identifiants de tweets font 64 bits, renvoie donc l'identifiant **deux fois** dans ses réponses JSON : comme nombre, et comme chaîne décimale.
- **Pas de chaînes binaires.** JSON et XML gèrent bien le texte Unicode, mais pas des suites d'octets. On contourne avec du **Base64**, ce qui marche mais gonfle les données de **33 %**.
- **Les schémas sont optionnels et compliqués.** XML Schema est répandu ; beaucoup d'outils JSON s'en passent. Sans schéma, l'application doit coder en dur l'interprétation des nombres et des chaînes binaires.
- **CSV n'a aucun schéma** : à l'application de décider du sens de chaque colonne. Et le format est flou (une virgule dans une valeur ? un saut de ligne ?).

Malgré tout, JSON, XML et CSV suffisent pour beaucoup d'usages, surtout comme **format d'échange entre organisations** : l'important est de s'accorder, et faire s'entendre deux entreprises pèse plus que l'élégance du format.

### Encodages binaires de JSON

Pour des données **internes**, la pression pour un format « plus petit dénominateur commun » disparaît. Sur de petits volumes, le gain est négligeable ; au-delà du téraoctet, le choix du format compte. D'où une profusion d'encodages binaires de JSON : MessagePack, BSON, BJSON, UBJSON, Smile… (et WBXML, Fast Infoset pour XML). Certains ajoutent des types (entiers distincts des flottants, chaînes binaires), mais gardent le **même modèle de données** : comme ils n'ont pas de schéma, ils doivent **inclure les noms de champs** dans les octets.

Exemple du livre : l'enregistrement `{"userName": "Martin", "favoriteNumber": 1337, "interests": ["daydreaming", "hacking"]}`. En JSON sans espaces : **81 octets**. En MessagePack : **66 octets**. Le gain est mince, et il coûte la lisibilité. Les leçons suivantes montrent comment faire bien mieux : **32 octets** pour la même donnée.

## Pièges fréquents

- **Utiliser `pickle` ou `Serializable` pour un format stocké longtemps** : lié à un langage, risqué et sans versionnement.
- **Mettre un identifiant 64 bits dans du JSON lu par du JavaScript** : il sera tronqué silencieusement. Envoie-le en chaîne.
- **Croire que « binaire » veut dire « petit »** : un MessagePack garde tous les noms de champs ; seul un schéma permet de les supprimer.
- **Ne tester que la compatibilité dans un sens** : une mise à jour progressive exige les deux.

## À retenir

- Pendant un déploiement progressif, anciennes et nouvelles versions coexistent : il faut rétrocompatibilité (nouveau lit ancien) **et** compatibilité ascendante (ancien lit nouveau).
- Encoder = mémoire vers octets ; décoder = l'inverse.
- Les formats propres à un langage sont à éviter hors usage transitoire.
- JSON, XML, CSV : répandus mais flous sur les nombres et les binaires ; les variantes binaires de JSON économisent peu car elles gardent les noms de champs.
