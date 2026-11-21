## Contexte

Message de l'équipe finance :

> On a passé les frais de service à 1,80 € dans `fees.properties` il y a deux semaines, comme d'habitude. Les clients paient toujours un autre montant, et le support nous dit que la recette facture 9,99 € par place. En production, le contrat impose 2,00 €. On ne touche qu'à `fees.properties`, on n'y comprend plus rien.

Les fichiers : `application.yml` (la configuration de l'application, avec un document pour le profil `prod`), `fees.properties` (la grille de la finance), `config/application.properties`, `app/PricingConfig.java` (qui charge la grille) et `app/FeeService.java` (qui lit les frais). Les tests rejouent les démarrages de recette et de production.

## Ta mission

1. Trouve **pourquoi** le tarif de `fees.properties` n'est pas appliqué. Il y a plus d'une cause.
2. Corrige-les, pour que :
   - sans profil : `180 EUR`, la grille de la finance ;
   - avec le profil `prod` : `200 EUR` ;
   - une option `--tixa.fee-cents=…` en ligne de commande l'emporte toujours.
3. `fees.properties` doit rester **le seul fichier** que la finance modifie : le prochain changement de tarif doit s'appliquer sans toucher à autre chose.

Ne modifie pas les tests.
