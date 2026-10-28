**Requêtes et événements coexistent dans le même système.** Les lectures (historique, profil, catalogue) restent des requêtes déterministes ; les faits (une offre, une adjudication, un cours qui change) sont des événements auxquels plusieurs processeurs réagissent.

En broker, chaque processeur annonce ce qu'il a fait (`order-created`, `payment-applied`…) et le suivant réagit : une course de relais. Un événement que personne n'écoute n'est pas un gaspillage, c'est une prise prête pour demain.
