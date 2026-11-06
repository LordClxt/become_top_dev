## Hint 1
Une fabrique statique est une méthode `public static Temperature …(double …)` qui appelle le constructeur privé. Le nom porte l'unité, ce que le constructeur ne peut pas faire.

## Hint 2
Fais la conversion **dans** chaque fabrique, puis délègue à un seul endroit qui valide : le constructeur privé (ou une méthode privée) vérifie la borne du zéro absolu.

## Hint 3
`ofFahrenheit(f)` renvoie `ofCelsius((f - 32) * 5 / 9)` ; `ofKelvin(k)` renvoie `ofCelsius(k - 273.15)` ; `ofCelsius(c)` valide `c >= -273.15` puis fait `new Temperature(c)`.
