---
id: ts-ch01-l04
title: "Propriétés en trop et assignabilité"
source: { chapter: 2, pages: "53-56" }
duration_min: 20
concepts:
  - id: ts-excess-property-check
    label: "Les littéraux d'objet frais sont soumis à un contrôle supplémentaire : aucune propriété inconnue ; ce n'est pas de l'assignabilité"
  - id: ts-fresh-literal
    label: "Passer par une variable intermédiaire, ou utiliser une assertion, désactive le contrôle des propriétés en trop"
  - id: ts-weak-type
    label: "Type faible (toutes propriétés optionnelles) : la valeur doit partager au moins une propriété avec lui"
glossary:
  - term: "contrôle des propriétés en trop"
    definition: "Vérification supplémentaire appliquée à un littéral d'objet directement assigné ou passé : toute propriété inconnue du type cible est une erreur."
  - term: "type faible"
    definition: "Type dont toutes les propriétés sont optionnelles. TypeScript exige que la valeur en partage au moins une."
visuals: []
labs: [ts-ch01-l04-lab-excess]
extra: false
xp: 20
---

## Pourquoi c'est important

La leçon sur le typage structurel dit que les types sont ouverts : un objet avec **plus** de propriétés est accepté. Pourtant :

```ts
interface Room { numDoors: number; ceilingHeightFt: number }

const r: Room = {
  numDoors: 1,
  ceilingHeightFt: 10,
  elephant: 'present',   // erreur : 'elephant' n'existe pas dans le type Room
};
```

Contradiction ? Non : il y a **deux vérifications différentes**. L'assignabilité (structurelle, tolérante) et le **contrôle des propriétés en trop**, qui ne s'applique qu'aux **littéraux d'objet** écrits directement à l'endroit de l'assignation.

## Le concept

### Un contrôle réservé aux littéraux frais

```ts
const obj = { numDoors: 1, ceilingHeightFt: 10, elephant: 'present' };
const r: Room = obj;    // OK ! obj n'est pas un littéral « frais » : la variable intermédiaire désactive le contrôle
```

La vérification stricte ne frappe que le littéral écrit **sur place**. Elle existe parce que, dans le littéral, une propriété inconnue est presque toujours une faute de frappe (`numDoor`). Mais elle ne remet pas en cause la règle générale : un `Room` avec un éléphant reste un `Room`.

L'assertion la désactive aussi : `{ ..., elephant: 'present' } as Room` passe (c'est une des raisons de préférer l'annotation).

### Pareil pour les arguments et les retours

```ts
function setDarkMode() {}
interface Options { title: string; darkMode?: boolean }
function createWindow(options: Options) { /* … */ }

createWindow({ title: 'Spider Solitaire', darkmode: true });
//                                         ~~~~~~~ Did you mean 'darkMode'?
```

Sans ce contrôle, la faute `darkmode` passerait, puisqu'une propriété optionnelle absente est valide. Le contrôle des propriétés en trop est précisément ce qui permet d'avoir des options optionnelles **et** de repérer les fautes de frappe.

### Les types faibles

Un type dont **toutes** les propriétés sont optionnelles est « faible » :

```ts
interface LineChartOptions { logscale?: boolean; invertedYAxis?: boolean; areaChart?: boolean }

const opts = { logScale: true };    // faute de frappe : logScale vs logscale
const o: LineChartOptions = opts;   // erreur : l'objet n'a aucune propriété en commun avec le type faible
```

Sans cette règle, n'importe quel objet serait assignable à un type faible (l'ensemble des objets sans propriété obligatoire est énorme). TypeScript exige donc au moins une propriété partagée. Cette vérification est faite à **chaque assignation**, littérale ou non.

### Que retenir pour les options

Les options de configuration sont presque toujours un type faible plus des littéraux : tu bénéficies des deux contrôles. Si tu veux autoriser des propriétés inconnues, déclare-le (signature d'index, module 02) ; sinon laisse le contrôle te protéger.

## Pièges fréquents

- **Croire qu'il suffit de passer par une variable** pour « corriger » une erreur : tu désactives juste une protection, et la faute de frappe reste.
- **Confondre « propriété en trop » et « type incompatible »** : seule la première est limitée aux littéraux.
- **Écrire `as Options` pour faire passer un littéral** : même effet que ci-dessus.

## À retenir

- Un littéral d'objet assigné sur place est contrôlé strictement : aucune propriété inconnue.
- Une variable intermédiaire (ou une assertion) désactive ce contrôle ; l'assignabilité reste structurelle.
- Un type faible exige au moins une propriété commune, dans tous les cas.
- Ces deux contrôles rendent les objets d'options sûrs sans les rendre pénibles.
