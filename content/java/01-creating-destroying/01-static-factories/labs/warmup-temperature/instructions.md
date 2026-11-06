## Contexte

Un capteur envoie des degrés Celsius, un autre des Fahrenheit, un troisième des kelvins. Les trois sont des `double`. Avec des constructeurs, tu ne peux écrire **qu'un seul** `Temperature(double)` : le compilateur refuse trois signatures identiques. Aujourd'hui, l'équipe s'en sort avec `new Temperature(98.6)`… et personne ne sait dans quelle unité.

## Ta mission

Dans `Temperature.java` :

1. Rends le constructeur **privé** : plus personne n'écrit `new Temperature(…)`.
2. Écris trois fabriques statiques : `ofCelsius`, `ofFahrenheit`, `ofKelvin`. Toutes stockent la valeur en Celsius.
3. Une température sous le zéro absolu (−273,15 °C) lève `IllegalArgumentException`, quelle que soit l'unité d'entrée.

```java
Temperature.ofFahrenheit(212).celsius()  // 100.0
Temperature.ofKelvin(0).celsius()        // -273.15
Temperature.ofCelsius(-300)              // IllegalArgumentException
```

Rappels : `°C = (°F − 32) × 5 / 9` et `°C = K − 273,15`.
