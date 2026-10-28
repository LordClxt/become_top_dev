**La clinique n'a pas besoin d'une Ferrari.** Charge stable, six développeurs, budget serré, et une opération qui doit rester atomique : le style service-based coche tout. Six services de domaine, une base partagée avec des bibliothèques d'entités fédérées, la clôture de consultation dans une façade (un rollback suffit), et des déploiements indépendants par domaine.

Les microservices n'apporteraient ici que leur point fort inutile (l'élasticité) et leurs coûts (orchestration, sagas, exploitation).
