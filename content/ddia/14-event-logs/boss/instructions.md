Une plateforme de commandes doit alimenter, à partir d'une seule base de référence, un index de recherche (assez gros pour plusieurs indexeurs), un cache et un entrepôt, sans aucune double écriture. Elle doit aussi pouvoir **reconstruire** une nouvelle vue de lecture en rejouant le log, et **surveiller** le retard de ses consommateurs.

Conventions : appel = `sync` ; écriture dans une base ou une vue = `write` ; flux de changements ou livraison d'un log = `async` ; lecture d'un log par un outil = `read`.
