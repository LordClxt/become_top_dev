**Une couche fermée ne protège que si personne ne la contourne.** Le raccourci « temporaire » a fait dépendre la présentation d'une ligne SQL : le renommage d'une colonne, invisible pour le métier, a cassé l'écran. C'est exactement ce que l'isolation des couches devait empêcher.

Trois remparts : une **fitness function** de couches en CI (archkit, module 00) ; si l'exception est justifiée, une **variance** documentée et vérifiée ; et des **contrats** entre couches (un objet du métier, pas une ligne de base). Quant à la performance, elle se mesure, puis se traite explicitement.
