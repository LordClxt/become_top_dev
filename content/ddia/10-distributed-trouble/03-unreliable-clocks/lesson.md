---
id: ddia-ch10-l03
title: "Horloges non fiables"
source: { chapter: 8, pages: "287-295" }
duration_min: 45
concepts:
  - id: ddia-wall-vs-monotonic
    label: "L'horloge murale donne la date mais peut sauter en arrière ; l'horloge monotone mesure une durée mais n'a pas de sens entre machines"
  - id: ddia-ntp-drift
    label: "Le quartz dérive (jusqu'à 200 ppm) et NTP ne corrige qu'aussi bien que le réseau le permet"
  - id: ddia-lww-clock-skew
    label: "Ordonner des écritures par horodatage (last write wins) perd silencieusement des écritures quand les horloges sont décalées"
  - id: ddia-clock-confidence
    label: "Une lecture d'horloge est un intervalle de confiance, pas un instant précis"
  - id: ddia-truetime-snapshots
    label: "Spanner utilise l'intervalle de TrueTime et attend sa durée avant de valider, pour ordonner des transactions"
glossary:
  - term: "horloge murale (time-of-day clock)"
    definition: "Renvoie la date et l'heure selon le calendrier (secondes depuis le 1er janvier 1970 UTC) ; synchronisée par NTP, elle peut sauter."
  - term: "horloge monotone"
    definition: "Avance toujours ; sa valeur absolue n'a pas de sens, seule la différence entre deux lectures sur la même machine compte."
  - term: "NTP (Network Time Protocol)"
    definition: "Protocole qui règle l'horloge d'une machine d'après des serveurs de temps, eux-mêmes calés sur une source précise (GPS, horloge atomique)."
  - term: "dérive (drift)"
    definition: "Écart qui s'accumule parce qu'un quartz va un peu trop vite ou trop lentement, selon sa fabrication et sa température."
  - term: "seconde intercalaire (leap second)"
    definition: "Seconde ajoutée ou retirée à une minute pour suivre la rotation de la Terre ; elle a fait planter de grands systèmes."
  - term: "last write wins (LWW)"
    definition: "Résolution de conflit qui garde l'écriture au plus grand horodatage et jette les autres."
  - term: "TrueTime"
    definition: "API de Google Spanner qui renvoie un intervalle [au plus tôt, au plus tard] dans lequel se trouve l'heure réelle."
visuals: []
labs: [ddia-ch10-l03-lab-clock-design]
xp: 40
---

## Pourquoi c'est important

Les applications utilisent le temps partout : timeouts, percentiles de latence, expiration d'un cache, date d'un article, ordre de deux écritures. Or chaque machine a **sa propre horloge**, un petit cristal de quartz qui n'est jamais parfaitement exact. Tant que tu mesures une durée sur une seule machine, ce n'est pas grave. Dès que tu compares l'heure de deux machines pour décider « qui a écrit en dernier », tu peux **perdre des données sans le moindre message d'erreur**. C'est un des pièges les plus sournois des systèmes distribués.

## Deux horloges, deux usages

Un ordinateur moderne a (au moins) deux horloges, qui servent à des choses différentes.

### L'horloge murale

Elle répond à « quelle heure est-il ? » : `clock_gettime(CLOCK_REALTIME)` sous Linux, `System.currentTimeMillis()` en Java, `time.Now()` en Go. Elle renvoie en général le nombre de secondes écoulées depuis le 1er janvier 1970 UTC, **sans compter les secondes intercalaires**.

Elle est synchronisée par NTP, ce qui pose un problème : si l'horloge locale est très en avance, NTP peut la **remettre brutalement à l'heure**, et elle **recule**. Elle ignore aussi les secondes intercalaires. Certaines anciennes plateformes avaient en plus une résolution grossière (10 ms). Conclusion : **elle ne convient pas pour mesurer une durée**. Une requête qui commence à 12:00:00,500 et finit à 12:00:00,200 parce que NTP a reculé l'horloge entre-temps aurait une durée négative.

### L'horloge monotone

Elle répond à « combien de temps s'est écoulé ? » : `CLOCK_MONOTONIC` sous Linux, `System.nanoTime()` en Java. Sa propriété : elle **avance toujours**. Sa valeur absolue n'a aucun sens (par exemple le temps depuis le démarrage de la machine), et **comparer les valeurs monotones de deux machines n'a aucun sens** non plus.

NTP peut quand même l'influencer d'une façon douce : s'il voit que le quartz va trop vite ou trop lentement, il ajuste sa **fréquence** (de l'ordre de 0,05 % au maximum), mais il ne la fait jamais sauter. Sa résolution est fine (la microseconde ou mieux). Sur un serveur à plusieurs processeurs, chaque socket peut avoir son propre compteur ; l'OS compense pour présenter une horloge monotone cohérente aux threads, même quand ils changent de processeur.

**Règle** : pour un timeout, une latence, un délai d'expiration local, utilise l'horloge monotone. En Go, `time.Now()` embarque une lecture monotone, et `time.Since(start)` l'utilise automatiquement ; elle disparaît dès que tu sérialises le `time.Time` ou que tu le compares à une heure venue d'une autre machine.

## La synchronisation et ses limites

Une horloge monotone n'a pas besoin d'être synchronisée. Une horloge murale, si : on veut que toutes les machines affichent la même heure. NTP fait de son mieux, mais il y a beaucoup de façons d'être faux :

- **Le quartz dérive** selon sa fabrication et sa température. Google suppose une dérive de **200 ppm** (parties par million) pour ses serveurs : **6 ms** d'écart pour une machine resynchronisée toutes les 30 s, **17 s** pour une machine resynchronisée une fois par jour. Calcul : 86 400 s × 200 × 10⁻⁶ ≈ 17,3 s.
- Si l'horloge diffère trop du serveur NTP, le client peut **refuser de se synchroniser** ou être **remis à l'heure de force** : l'application voit le temps sauter en avant ou en arrière.
- Un nœud **coupé de NTP par un pare-feu** peut dériver pendant des jours sans que personne ne le remarque.
- NTP ne fait **pas mieux que le réseau** : une expérience a mesuré une erreur minimale d'environ 35 ms en se synchronisant via Internet, avec des pics occasionnels proches d'une seconde quand le réseau est encombré. Avec de gros délais, le client peut même abandonner.
- Certains **serveurs NTP sont faux** ou mal configurés, avec des heures de décalage. Un client robuste interroge plusieurs serveurs et écarte les valeurs aberrantes ; mais faire dépendre la justesse de ton système de l'heure donnée par un inconnu sur Internet a de quoi inquiéter.
- Les **secondes intercalaires** donnent des minutes de 59 ou 61 secondes ; elles ont fait planter de grands systèmes. On peut les « lisser » (*smearing*) en répartissant l'ajustement sur une journée.
- Dans une **machine virtuelle**, l'horloge est virtualisée : quand la VM est mise en pause quelques dizaines de millisecondes, son horloge **saute en avant** à la reprise.
- Sur un **appareil que tu ne contrôles pas** (téléphone, navigateur), l'horloge peut être fausse exprès : un joueur recule la date pour contourner une limite de temps.

On peut faire beaucoup mieux, si on y met le prix. La réglementation financière européenne MiFID II exige que les fonds de trading haute fréquence restent à moins de **100 µs** de l'UTC. On y arrive avec des récepteurs GPS, le protocole PTP (*Precision Time Protocol*), un déploiement soigné et une supervision constante.

## S'appuyer sur des horloges synchronisées : danger

Une horloge fausse ne fait pas planter le programme. Elle produit des résultats légèrement faux, **silencieusement**. D'où une première règle : si ton logiciel dépend d'horloges synchronisées, **surveille le décalage** entre toutes les machines, et déclare mort (retire du cluster) un nœud dont l'horloge dérive trop.

### Ordonner des écritures par horodatage

Scénario classique (fig. 8-3 du livre, refait avec nos chiffres). Trois nœuds, réplication multi-leader. L'horloge du nœud 1 **avance de 50 ms**, celle du nœud 3 est juste.

1. À l'instant réel 1 000 ms, le client A écrit `x = 1` sur le nœud 1. Horodatage : **1 050**.
2. Le client B lit `x = 1` sur le nœud 3, puis, à l'instant réel 1 030 ms, écrit `x = 2` (il incrémente). Horodatage : **1 030**.
3. Les deux écritures arrivent au nœud 2. Avec **last write wins** (LWW, ch06), il garde l'horodatage le plus grand : **x = 1**.

L'écriture de B, qui a pourtant eu lieu **après** et **en connaissant** celle de A, disparaît. Personne n'est averti. C'est la résolution par défaut de Cassandra, et une option courante ailleurs. Les problèmes de LWW :

- **Des écritures disparaissent mystérieusement** : un nœud en retard ne peut pas écraser une valeur écrite par un nœud en avance tant que l'écart ne s'est pas écoulé. Ici, pendant **50 ms** après l'écriture de A, toute écriture via le nœud 3 sur `x` est jetée.
- LWW **ne distingue pas** des écritures successives rapides (B dépend de A) d'écritures vraiment concurrentes. Il faudrait un suivi de causalité (vecteurs de versions, ch06).
- Deux nœuds peuvent produire **le même horodatage**, surtout avec une résolution à la milliseconde ; il faut départager (par un nombre aléatoire), ce qui peut aussi violer la causalité.

Peut-on régler le problème avec un NTP plus précis ? Non : la précision de NTP est limitée par le délai réseau, et l'écart qui suffit à perdre une écriture peut être plus petit. L'alternative sûre pour ordonner des événements, ce sont les **horloges logiques** : des compteurs qui ne mesurent pas le temps mais l'**ordre relatif** des événements (ch11). Les horloges murales et monotones sont, par contraste, des horloges **physiques**.

### Une lecture d'horloge est un intervalle

Ta machine affiche le temps à la microseconde, voire à la nanoseconde. C'est une **fausse précision** : si le quartz a dérivé depuis la dernière synchronisation, et que NTP lui-même avait quelques millisecondes d'incertitude, l'heure réelle est quelque part dans un intervalle. Il faudrait lire « entre 10,3 s et 10,5 s, avec 95 % de confiance », pas « 10,400 s ».

L'incertitude se calcule : dérive du quartz depuis la dernière synchronisation, plus incertitude du serveur NTP, plus temps aller-retour vers ce serveur. La plupart des API ne l'exposent pas. Exception notable : **TrueTime**, l'API de Google **Spanner**, qui renvoie explicitement `[earliest, latest]`.

### Instantanés globaux : l'astuce de Spanner

L'isolation par instantané (ch08) a besoin d'un identifiant de transaction croissant pour savoir quelles versions une transaction voit. Sur un seul nœud, un compteur suffit. Sur plusieurs datacentres, un compteur global devient un goulot d'étranglement. Utiliser l'horodatage d'horloges synchronisées comme identifiant ? Le problème de l'incertitude revient.

Spanner s'en sert quand même, avec l'intervalle. Si deux intervalles **ne se chevauchent pas** (le « au plus tard » de A précède le « au plus tôt » de B), alors B est **certainement** postérieure à A. S'ils se chevauchent, on ne sait pas. Spanner **attend donc délibérément la durée de l'intervalle** avant de valider une transaction en écriture : ainsi, toute transaction qui pourrait lire ses données aura un intervalle qui ne chevauche pas le sien. Pour que cette attente reste courte, Google installe un **récepteur GPS ou une horloge atomique dans chaque datacentre**, et tient l'incertitude autour de **7 ms**.

> **Aller plus loin.** D'autres bases (CockroachDB, YugabyteDB) s'inspirent de Spanner sans matériel spécial : elles combinent horloge physique et compteur logique (*hybrid logical clocks*) et bornent le décalage toléré (500 ms par défaut chez CockroachDB), en redémarrant une lecture si une valeur tombe dans la zone d'incertitude. Amazon et d'autres clouds proposent désormais des services d'heure précis à la microseconde, qui rendent l'approche plus accessible.

## Pièges fréquents

- **Mesurer une durée avec l'horloge murale** : elle peut reculer, et la durée devient négative.
- **Comparer les horloges monotones de deux machines** : leurs valeurs absolues n'ont pas de sens.
- **Utiliser LWW pour un compteur ou un panier** : une écriture faite après une autre peut être jetée sans bruit.
- **Croire qu'un affichage à la nanoseconde veut dire une précision à la nanoseconde.**
- **Laisser un nœud dériver sans supervision** : une horloge fausse ne plante pas, elle corrompt.
- **Faire confiance à l'horloge d'un client** (téléphone, navigateur).

## À retenir

- Horloge murale : la date, synchronisée, peut sauter. Horloge monotone : les durées, toujours croissante, locale à la machine.
- Le quartz dérive (200 ppm ≈ 17 s par jour) ; NTP ne fait pas mieux que le réseau ; VM, secondes intercalaires et pare-feux ajoutent des sauts.
- LWW perd silencieusement des écritures dès qu'il y a un décalage ; pour ordonner, utilise des horloges logiques.
- Une heure lue est un intervalle de confiance ; Spanner l'expose (TrueTime) et attend sa durée avant de valider.
