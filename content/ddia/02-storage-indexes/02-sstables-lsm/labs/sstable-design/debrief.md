**La fusion est un mergesort où le plus récent gagne.** Résultat : `a=✗`, `b=2`, `c=3`, `d=2`, `e=1`, `f=3`. La pierre tombale de `a` **doit survivre** tant qu'un segment plus ancien non fusionné contient la clé ; on ne la jette que lorsqu'on fusionne *tous* les segments plus anciens.

Un index creux se règle comme un compromis : 10 000 entrées avec un pas de 64 donnent 157 repères en mémoire et jamais plus de 64 entrées à balayer. Et l'ordre d'écriture est non négociable : **journal d'abord**, puis memtable, puis flush, puis on jette le journal.
