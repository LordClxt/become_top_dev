---
id: ts-ch05-l03
title: "Repousser null au périmètre de ses types"
source: { chapter: 4, pages: "148-154" }
duration_min: 30
concepts:
  - id: ts-no-null-in-alias
    label: "Ne pas cacher null dans un alias (type User = {...} | null) : écrire User | null là où c'est vrai"
  - id: ts-null-perimeter
    label: "Les valeurs liées doivent être null ensemble : un seul [min, max] | null plutôt que min et max nullables séparément"
  - id: ts-falsy-zero-bug
    label: "Tester une valeur numérique par sa vérité (if (!min)) confond 0 et undefined : bug typique des nullables dispersés"
  - id: ts-class-complete-init
    label: "Une classe dont les champs se remplissent plus tard est pleine de null ; une fabrique static async init qui attend toutes les données donne des champs non nuls"
glossary:
  - term: "périmètre d'un type"
    definition: "Le niveau le plus extérieur d'une valeur : on rend nullable l'ensemble (le résultat entier) plutôt que chacun de ses morceaux."
visuals: []
labs: [ts-ch05-l03-lab-null-perimeter]
extra: false
xp: 30
---

## Pourquoi c'est important

Avec `strictNullChecks`, chaque `null` possible doit être testé. Quand ils sont **dispersés** dans plusieurs variables ou champs, les relations entre eux (« si `min` est défini, `max` aussi ») restent implicites : le vérificateur ne les connaît pas, toi non plus au bout d'un moment. La solution : rendre nullable **le tout**, pas les parties.

## Le concept

### Pas de null caché dans un alias

```ts
type User = { id: string; name: string } | null;   // à éviter
function getUserName(u: User) { return u.name; }   // erreur surprenante : 'u' is possibly 'null'
```

Quiconque lit `User` s'attend à un utilisateur, pas à « un utilisateur ou rien ». Écris `type User = { id: string; name: string }` et `User | null` là où l'absence est possible. (Même règle pour `undefined`.)

### Les valeurs liées doivent être null ensemble

```ts
function extent(nums: Iterable<number>) {
  let min, max;
  for (const num of nums) {
    if (!min) {
      min = num;
      max = num;
    } else {
      min = Math.min(min, num);
      max = Math.max(max, num);
      //             ~~~ 'number | undefined' is not assignable to 'number'
    }
  }
  return [min, max];
}
```

Deux bugs : `extent([0, 1, 2])` renvoie `[1, 2]` (le test `!min` prend `0` pour une absence), et une liste vide donne `[undefined, undefined]`. Le type de retour, `(number | undefined)[]`, est pénible à utiliser. La correction : un seul objet nullable.

```ts
function extent(nums: Iterable<number>) {
  let minMax: [number, number] | null = null;
  for (const num of nums) {
    if (!minMax) {
      minMax = [num, num];
    } else {
      const [oldMin, oldMax] = minMax;
      minMax = [Math.min(num, oldMin), Math.max(num, oldMax)];
    }
  }
  return minMax;
}
// [number, number] | null
```

L'appelant teste **une fois** : `const span = extent(nums); if (span) { const [min, max] = span; … }`.

### Les classes à moitié initialisées

```ts
class UserPosts {
  user: UserInfo | null;
  posts: Post[] | null;
  constructor() { this.user = null; this.posts = null; }
  async init(userId: string) { /* remplit les deux, en parallèle */ }
  getUserName() { /* ??? user peut être null… */ }
}
```

Il y a quatre combinaisons de `null` possibles, et chaque méthode doit les gérer. Mieux : attendre **toutes** les données avant de construire l'objet.

```ts
class UserPosts {
  user: UserInfo;
  posts: Post[];
  constructor(user: UserInfo, posts: Post[]) { this.user = user; this.posts = posts; }

  static async init(userId: string): Promise<UserPosts> {
    const [user, posts] = await Promise.all([fetchUser(userId), fetchPostsForUser(userId)]);
    return new UserPosts(user, posts);
  }

  getUserName() { return this.user.name; }   // plus de null
}
```

Le `null` est repoussé au périmètre : soit tu as un `UserPosts` complet, soit tu n'en as pas.

## Pièges fréquents

- **`type X = … | null`** : le nom ment ; garde le `null` à l'usage.
- **Plusieurs variables nullables liées** : regroupe-les en un objet ou un tuple nullable.
- **`if (!n)` sur un nombre** : `0` passe pour une absence ; compare à `null`/`undefined`.
- **Des champs de classe remplis « plus tard »** : une fabrique asynchrone construit un objet complet.

## À retenir

- Pas de `null` dans un alias : `User | null` à l'usage.
- Rends nullable le tout plutôt que les parties : un seul test, et des relations explicites.
- Une classe ne devrait exister qu'une fois ses données disponibles (`static async init`).
