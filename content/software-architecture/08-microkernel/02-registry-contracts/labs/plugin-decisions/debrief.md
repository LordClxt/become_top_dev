**Les règles du microkernel protègent son cœur.** Passer les plug-ins en REST ne crée aucun quantum (tout passe par le cœur) mais transforme un monolithe simple en système distribué. Un plug-in qui lit la base centrale se couple à son schéma. Un `if` pour Samsung ramène la complexité dans le cœur : l'adaptateur est fait pour ça. En revanche, un stockage de règles propre à chaque plug-in respecte parfaitement le découplage.

Le registre, lui, peut mêler les modes d'accès : appel de fonction, file, URL. C'est au cœur de savoir comment joindre chaque plug-in, et à personne d'autre.
