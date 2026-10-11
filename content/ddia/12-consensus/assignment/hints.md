## Hint 1
Même logiciel partout → transaction interne ; technologies différentes → XA ; « un seul » ou « unique » → consensus ; une adresse un peu en retard → DNS.

## Hint 2
Disponibilités indépendantes : on les multiplie. Latence : un aller-retour (avec le fsync du participant pendant cet aller-retour), puis le fsync du coordinateur.

## Hint 3
Le délai de session doit dépasser la plus longue pause, sans que délai + 3 s dépasse 10 s. Dans etcd, seulement ce qui change lentement et que tout le monde doit voir pareil.
