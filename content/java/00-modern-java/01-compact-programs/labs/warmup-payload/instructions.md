## Contexte

Le service de notifications envoie à l'application mobile un petit document JSON. Aujourd'hui il est construit par concaténation : personne n'ose plus y toucher, et la dernière modification a décalé l'indentation (le client mobile compare des captures dans ses tests, qui échouent tous).

## Ta mission

Réécris `Payload.notification(String user, int unread)` avec **un bloc de texte** et `formatted(...)`. Le résultat doit être exactement :

```json
{
  "user": "ada",
  "unread": 3,
  "links": ["inbox", "settings"]
}
```

pour `notification("ada", 3)` : deux espaces d'indentation, et un saut de ligne final après `}`.

## Contraintes

- Plus aucune concaténation (`+`) ni `\n` écrit à la main dans `Payload.java`.
- Pas d'échappement de guillemets : c'est tout l'intérêt du bloc de texte.
