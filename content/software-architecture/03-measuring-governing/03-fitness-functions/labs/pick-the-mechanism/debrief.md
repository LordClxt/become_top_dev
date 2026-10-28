**« Tout mécanisme » ne veut pas dire « n'importe lequel ».** Ce qui se lit dans le code (couches, cycles, complexité, taille) se vérifie **au commit ou au build**, au plus tôt. Ce qui n'existe qu'à l'exécution (latence réelle) se surveille **en production**. Et la résilience ne se prouve qu'en **provoquant** la panne : c'est le chaos engineering, que Netflix a décliné en toute une armée de singes.

Plus une fitness function tourne tôt et souvent, moins la dérive coûte cher à corriger.
