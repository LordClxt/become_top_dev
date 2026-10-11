**Une API très lue se construit autour de ses lectures.** Le cache absorbe l'essentiel du trafic de lecture, la base principale ne reçoit que les écritures, le réplica copie ses changements, et tout ce qui peut attendre (e-mails, notifications) passe par une file : l'utilisateur n'attend pas.

Lance la simulation : à la **première requête**, le cache est froid et la requête descend jusqu'à la base ; à la **deuxième**, Redis répond seul. Casse la base (bouton *Panne* du bloc) pour voir ce qui continue de fonctionner.
