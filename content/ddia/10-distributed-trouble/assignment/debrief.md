**Le double débit n'est pas un bug de réseau ni d'horloge : c'est une course « vérifier puis agir » qu'aucune ressource ne bloquait.** A a vérifié son bail, s'est figé 12 s, et a agi au réveil alors que B, légitimement, avait repris la file.

Les correctifs qui tiennent sont ceux qui ne dépendent pas de la durée d'une pause : un **jeton de clôture** vérifié par la base (41 est refusé dès que 42 a été vu), et une **clé d'idempotence** par paiement. Allonger le bail ou vérifier deux fois ne fait que déplacer la fenêtre.

Le service de verrous doit être majoritaire et de taille impaire : 6 nœuds ne tolèrent que 2 pannes, comme 5. Ses garanties se lisent en **sûreté** (jamais deux débits, jamais deux leaders actifs : exigées toujours) et **vivacité** (une réponse, un nouveau leader : sous conditions). Le tout se raisonne dans un modèle **partiellement synchrone avec crash-recovery**.
