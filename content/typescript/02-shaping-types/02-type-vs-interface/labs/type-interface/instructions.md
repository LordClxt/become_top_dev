## Contexte

Les deux façons de déclarer un type ne sont pas interchangeables : unions et tuples exigent `type`, `extends` vérifie ce que `&` laisse passer, et seules les interfaces fusionnent. Tu choisis la bonne forme dans quatre situations, et tu corriges un héritage cassé.

Tu édites `models.ts`.

## À faire

1. `Dog` redéclare `legs` avec un type incompatible : lis l'erreur d'`extends`, corrige-la (supprime la redéclaration).
2. `Pet` : un chien **ou** un chat. `Coord` : un tuple nommé `[lat, lng]`.
3. `Settings` : **deux interfaces homonymes** qui fusionnent (`theme: 'light' | 'dark'` d'un côté, `fontSize: number` de l'autre). `defaultSettings()` renvoie `{ theme: 'light', fontSize: 14 }`.
4. `describePet` : `Rex (chien Labrador, 4 pattes)` ou `Tom (chat d'intérieur, 4 pattes)` (`d'extérieur` si `indoor` est faux). `distance` : distance euclidienne entre deux `Coord`.

## Contraintes

Pas de `any`. Utilise `interface` pour les objets et `type` uniquement quand il le faut.
