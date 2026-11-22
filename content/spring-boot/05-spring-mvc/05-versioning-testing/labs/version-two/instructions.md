## Contexte

`GET /events/{id}` renvoie aujourd'hui le contrat de la version 1 (`EventV1` : `name`, `date`, `city`), utilisé par l'application mobile, qui n'envoie aucun en-tête de version. Le site web veut le contrat de la version 2 (`EventV2` : `title`, `startsAt`, `venue`), déjà écrit. La sonde de l'hébergeur appelle `/health`, sans en-tête elle non plus.

La version 1 sera dépréciée le **1er décembre 2026** et éteinte le **1er juin 2027** ; la documentation de migration est à `https://tixa.example/docs/v2`.

## Ta mission

1. La version se lit dans l'en-tête `API-Version` ; versions prises en charge : 1 et 2.
2. `API-Version: 2` renvoie `EventV2`. Sans en-tête, ou avec `1` : `EventV1`, **identique** à aujourd'hui.
3. Les réponses en version 1 annoncent leur fin : `Deprecation`, `Sunset`, et un `Link` vers la documentation (`rel="sunset"`).
4. Une version inconnue : 400 (en ProblemDetail grâce au conseil fourni). `/health` répond toujours sans en-tête.

Fichiers modifiables : `EventController.java` et `WebConfig.java`.
