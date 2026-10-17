---
id: ts-ch06-l02
title: "Limiter les propriétés optionnelles"
source: { chapter: 4, pages: "165-168" }
duration_min: 25
concepts:
  - id: ts-optional-cost
    label: "Une propriété optionnelle peut être oubliée sans erreur et chaque lecture doit gérer undefined (valeurs par défaut dispersées et incohérentes)"
  - id: ts-input-vs-normalized
    label: "Séparer le type saisi (InputAppConfig, optionnels) du type normalisé (AppConfig = Required<…>) produit par une fonction de normalisation"
  - id: ts-optional-combinations
    label: "N propriétés optionnelles créent 2^N combinaisons à tester ; une option qui doit être fournie ne doit pas être optionnelle"
glossary:
  - term: "Required<T>"
    definition: "Type utilitaire qui rend obligatoires toutes les propriétés de T (l'inverse de Partial)."
visuals: []
labs: [ts-ch06-l02-lab-app-config]
extra: false
xp: 25
---

## Pourquoi c'est important

Ajouter une propriété optionnelle semble sans risque : le code existant compile toujours. C'est justement le problème. **Rien ne t'oblige à la prendre en compte**, et chaque endroit qui la lit invente sa propre valeur par défaut.

## Le concept

### Le coût caché d'un optionnel

Une application de randonnée affiche les distances en système impérial. On ajoute une option :

```ts
interface FormattedValue { value: number; units: string }
function formatValue(value: FormattedValue) { /* … */ }

interface Hike { miles: number; hours: number }
function formatHike({ miles, hours }: Hike) {
  const distanceDisplay = formatValue({ value: miles, units: 'miles' });
  const paceDisplay = formatValue({ value: miles / hours, units: 'mph' });
  return `${distanceDisplay} at ${paceDisplay}`;
}

interface AppConfig {
  darkMode: boolean;
  // par défaut : impérial
  unitSystem?: UnitSystem;
}
```

`formatHike` compile toujours… et ignore complètement l'option. Pour la passer, il faut modifier chaque appel, et aucune erreur ne te guide. Pire : chaque lecture choisit une valeur par défaut (`config.unitSystem ?? 'imperial'` ici, `?? 'metric'` ailleurs, par erreur). Les bugs d'incohérence apparaissent.

### Séparer saisie et configuration normalisée

```ts
interface InputAppConfig {
  darkMode: boolean;
  // par défaut : impérial
  unitSystem?: UnitSystem;
}
interface AppConfig extends InputAppConfig {
  unitSystem: UnitSystem;   // obligatoire
}
// ou : type AppConfig = Required<InputAppConfig>;

function normalizeAppConfig(inputConfig: InputAppConfig): AppConfig {
  return {
    ...inputConfig,
    unitSystem: inputConfig.unitSystem ?? 'imperial',
  };
}
```

La valeur par défaut est appliquée **une seule fois**, à l'entrée. Le reste du code manipule un `AppConfig` sans optionnel, et `formatHike(hike, config: AppConfig)` peut lire `config.unitSystem` sans test. C'est la loi de Postel du module 05 appliquée aux options.

### L'explosion combinatoire

Avec N propriétés optionnelles, il y a 2^N combinaisons de présence : impossible de toutes les tester. Avant d'en ajouter une, demande-toi :

- l'option est-elle **vraiment** facultative pour l'appelant ? Si oui, peut-on la normaliser tout de suite ?
- est-ce une **migration** (l'option deviendra obligatoire) ? Alors rends-la obligatoire et corrige les appels : c'est le compilateur qui te guide.

Un paramètre optionnel d'une fonction a le même problème : pour une fonction interne, préfère souvent un paramètre obligatoire.

## Pièges fréquents

- **Ajouter un `?` pour éviter de corriger les appels existants** : les appels oubliés ne seront jamais signalés.
- **`?? défaut` répété à chaque lecture** : défauts dispersés, risque d'incohérence.
- **Propager un type plein d'optionnels dans tout le code** : normalise à l'entrée.

## À retenir

- Les propriétés optionnelles peuvent être oubliées et compliquent chaque lecture.
- Sépare la forme saisie (optionnelle) de la forme normalisée (`Required`), produite par une seule fonction.
- Chaque optionnel double le nombre de combinaisons : n'en ajoute qu'avec une bonne raison.
