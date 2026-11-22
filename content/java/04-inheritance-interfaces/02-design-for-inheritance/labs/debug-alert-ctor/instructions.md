## Contexte

Les équipes d'Ordo écrivent leurs propres alertes en étendant `Alert`. Depuis ce matin, `new ThresholdAlert("cpu", "acme", 12_500)` lève une `NullPointerException` sur `symbol`, un champ `final` que le constructeur affecte pourtant juste après `super(name)`. L'équipe conformité signale le même problème avec sa `KeywordAlert` (fournie : tu ne peux pas la modifier). Et une autre équipe s'apprête à livrer la sienne, écrite de la même façon.

Le moteur crée chaque alerte, puis l'**arme** avec `arm()`. Le journal doit contenir, pour chaque alerte armée, une ligne `armée : <nom> (<description>)`.

## Ta mission

1. Toutes les alertes, y compris celles des autres équipes écrites de façon ordinaire, se construisent sans erreur.
2. La ligne de journal est écrite quand l'alerte est armée, une seule fois, avec sa description complète. La construction seule n'écrit rien.
3. `arm()` ne peut pas être redéfinie ; `ThresholdAlert`, qui n'est pas conçue pour l'héritage, ne peut pas être étendue.

Fichiers modifiables : `Alert.java` et `ThresholdAlert.java`.
