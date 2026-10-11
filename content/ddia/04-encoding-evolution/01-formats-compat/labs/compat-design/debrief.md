**Pendant un déploiement progressif, deux versions du code cohabitent.** D'où deux exigences : le *nouveau* code doit lire l'*ancien* format (rétrocompatibilité), et l'*ancien* code doit tolérer le *nouveau* (compatibilité ascendante). La seconde est la plus délicate, car elle oblige l'ancien code à ignorer ce qu'il ne connaît pas.

Et le choix du format compte : un format propre à un langage enferme et expose à des failles ; JSON est répandu mais flou sur les nombres et les octets (Base64 : +33 %, soit 8 Mo pour 6 Mo).
