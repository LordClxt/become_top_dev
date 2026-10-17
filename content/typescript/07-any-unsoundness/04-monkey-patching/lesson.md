---
id: ts-ch07-l04
title: "Des alternatives typées au monkey patching"
source: { chapter: 5, pages: "198-202" }
duration_min: 20
concepts:
  - id: ts-monkey-patching
    label: "Ajouter des propriétés arbitraires à window, document ou un objet DOM (monkey patching) crée des globales cachées et oblige à des any"
  - id: ts-global-augmentation
    label: "declare global { interface Window { user: User | undefined } } (augmentation) type une globale pour tout le projet, sans valeur à l'exécution"
  - id: ts-narrow-augmentation
    label: "Un type local (typeof window & { user: … }) ou une structure dédiée (WeakMap, module) limite la portée, et reste souvent la meilleure solution"
glossary:
  - term: "monkey patching"
    definition: "Modifier à l'exécution un objet qu'on ne possède pas (window, un prototype, un élément DOM) pour lui ajouter des propriétés ou des méthodes."
  - term: "augmentation de déclaration"
    definition: "Fusion d'une nouvelle déclaration (interface) avec une existante, souvent dans `declare global`, pour ajouter des membres à un type."
visuals: []
labs: [ts-ch07-l04-lab-globals]
extra: false
xp: 20
---

## Pourquoi c'est important

En JavaScript, on peut accrocher n'importe quoi à n'importe quel objet : `window.monkey = 'Tamarin'`, `document.monkey = 'Howler'`. C'est une forme de variable globale, avec tous ses défauts. TypeScript le refuse par défaut : il ne connaît pas ces propriétés. La tentation est `(window as any).user`. Il y a mieux.

## Le concept

### Le problème

```ts
document.monkey = 'Tamarin';
//       ~~~~~~ Property 'monkey' does not exist on type 'Document'
(document as any).monkey = 'Tamarin';   // passe, mais aucune vérification
```

Avec `as any`, une faute de frappe (`(window as any).usr`) passe, et le type de la valeur est perdu.

### Augmenter le type global

Si tu dois vraiment stocker une donnée dans `window`, déclare-la :

```ts
declare global {
  interface Window {
    /** L'utilisateur connecté, renseigné après la connexion. */
    user: User | undefined;
  }
}

window.user = { name: 'Ada' };   // vérifié
```

C'est une **augmentation** : l'interface `Window` existante est fusionnée avec la tienne. Avantages : sûr, documenté, autocomplété. Limites : l'augmentation est **globale** (tout le projet voit `user`, même le code qui s'exécute avant qu'elle soit renseignée, d'où le `| undefined`).

### Restreindre la portée

Un type local évite de polluer le projet :

```ts
type MyWindow = typeof window & { user: User | undefined };
(window as MyWindow).user = { name: 'Ada' };
```

Mais la meilleure solution est souvent de **ne pas** utiliser de globale : passer la donnée explicitement, la garder dans un module (`let currentUser: User | undefined` + des fonctions d'accès), ou, pour associer des données à des objets qu'on ne possède pas (des éléments DOM), une `WeakMap` :

```ts
const metadata = new WeakMap<Element, { tooltip: string }>();
metadata.set(button, { tooltip: 'Envoyer' });
```

Aucune propriété ajoutée à l'objet, un type exact, et la mémoire est libérée avec l'élément.

## Pièges fréquents

- **`(window as any).quelqueChose`** : ni vérification, ni autocomplétion, ni type.
- **Une augmentation globale pour une donnée locale** : tout le projet la voit.
- **Oublier `| undefined`** : la globale n'existe pas avant d'être renseignée.
- **Accrocher des données aux éléments DOM** : préfère une `WeakMap`.

## À retenir

- Évite le monkey patching ; sinon, type-le.
- `declare global` + augmentation d'interface pour une globale nécessaire.
- Un type local, un module ou une `WeakMap` limitent la portée et sont souvent préférables.
