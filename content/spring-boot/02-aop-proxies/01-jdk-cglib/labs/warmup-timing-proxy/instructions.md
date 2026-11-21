## Contexte

On veut connaître la durée de chaque appel au catalogue de Tixa, sans ajouter une ligne de mesure dans chaque méthode. C'est exactement le travail d'un **proxy** : un objet qui se fait passer pour la cible, fait quelque chose avant et après, puis lui délègue l'appel.

Tu écris `Proxies.timed` avec `ProxyFactory`, l'outil de Spring qui fabrique des proxies. `Metrics`, `Ticker` (une horloge en millisecondes) et les classes cibles sont fournis.

## Ta tâche

`Proxies.timed(target, ticker, metrics)` renvoie un proxy de `target` qui, pour chaque appel :
1. lit l'heure (`ticker.millis()`) ;
2. appelle la méthode de la cible ;
3. enregistre `NomSimpleDeLaClasse.méthode durée` dans `metrics`, par exemple `MemoryCatalog.find 30`, **même si l'appel lève une exception**, qui doit alors remonter telle quelle.

Laisse `ProxyFactory` choisir la technique :
- une cible qui implémente une interface (`MemoryCatalog`) donne un **proxy JDK** ;
- une cible sans interface (`PriceCalculator`) donne un **proxy CGLIB**, une sous-classe générée.

## À observer

`PriceCalculator.fee()` est `final`. Lance les tests et regarde ce que le proxy en fait.
