**La cohésion se lit au lien entre les éléments.** `pricing` est fonctionnel : tout sert une fonction complète. `import` est séquentiel, `order-confirm` communicationnel (une chaîne sur la même information). `boot` n'est lié que par le **moment**, `dateUtils` par un **thème**, et `misc.ts` par rien du tout.

Les trois derniers sont les candidats au découpage… mais pas forcément urgents : `boot` est un endroit légitime pour un démarrage, et `dateUtils` reste inoffensif tant qu'il n'attire pas le reste. `misc.ts`, lui, deviendra le module dont tout dépend.
