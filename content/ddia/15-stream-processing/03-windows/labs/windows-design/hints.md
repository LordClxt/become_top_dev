## Hint 1
Convertis tout en secondes après 10:00:00 et rappelle-toi que chaque fenêtre est [début, fin) : le début est inclus, la fin exclue.

## Hint 2
Une fenêtre hopping de 2 minutes qui commence à 10:01 couvre [60 s, 180 s). Une session est coupée dès que deux clics consécutifs sont séparés de 60 s ou plus.

## Hint 3
Pour la fenêtre sliding, cherche trois clics consécutifs dont le premier et le dernier sont à moins de 60 s : regarde 10:00:40, 10:01:10 et 10:01:35.
