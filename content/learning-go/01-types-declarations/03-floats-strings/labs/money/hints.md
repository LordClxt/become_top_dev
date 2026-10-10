## Hint 1
Pour `ParseCents`, coupe la chaîne au point, lis la partie entière et la partie décimale chiffre par chiffre, puis calcule `entier*100 + décimales`. Pas besoin de `strconv`, encore moins de `float64`.

## Hint 2
Une partie décimale d'un seul chiffre représente des **dizaines** de centimes : `"0.5"` donne 50, pas 5. Pour `SplitBill`, la division entière et le reste (`/` et `%`) te donnent la part de base et le nombre de personnes qui paient un centime de plus.

## Hint 3
Pour `Approx`, traite d'abord `a == b` (ça couvre `+Inf == +Inf`), puis refuse tout ce qui est `NaN` ou infini avec `math.IsNaN` et `math.IsInf`, et enfin compare `math.Abs(a-b)` à `epsilon`. Pour `FormatCents`, le plus petit `int64` n'a pas d'opposé positif : travaille sur un `uint64` pour la valeur absolue.
