**Tu viens de dessiner un système qui ne fait confiance à aucun de ses composants pris seul.**

- **La vérité est majoritaire** : le leader et le remplaçant n'ont le droit d'écrire qu'en obtenant un bail d'un service de coordination d'au moins trois nœuds répliqués. Un nœud isolé ou figé ne peut pas imposer sa vision.
- **La ressource se défend elle-même** : chaque écriture porte un jeton de clôture ; si l'ancien leader se réveille d'une pause GC, son jeton périmé est rejeté par le stockage.
- **Le soupçon est mesuré** : le détecteur adapte son timeout à la distribution des battements de cœur au lieu d'une constante, ce qui limite les bascules inutiles et les cascades.
- **Le temps est surveillé** : plusieurs sources NTP mettent un serveur faux en minorité, et la supervision exclut un nœud qui dérive, parce qu'une horloge fausse ne plante pas.

Les trois pièges reprennent le chapitre : un verrou sur un seul nœud (pas de majorité, pas de jeton), last write wins (perte silencieuse dès que les horloges divergent), et le swap (une source de pauses longues qui fabrique des zombies).
