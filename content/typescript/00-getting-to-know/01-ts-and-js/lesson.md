---
id: ts-ch00-l01
title: "TypeScript et JavaScript : un surensemble, pas un autre langage"
source: { chapter: 1, pages: "1-7" }
duration_min: 20
concepts:
  - id: ts-superset
    label: "Tout programme JavaScript est un programme TypeScript valide ; l'inverse est faux dès qu'on écrit une annotation de type"
  - id: ts-static-checking
    label: "Le vérificateur de types repère, sans exécuter le code, des erreurs qui lèveraient une exception ou produiraient un résultat absurde"
  - id: ts-annotations-intent
    label: "Une annotation exprime ton intention : plus tu en donnes, plus TypeScript trouve de problèmes, et mieux il les décrit"
  - id: ts-unsound
    label: "Le système de types n'est pas « sound » : un programme qui passe peut quand même planter à l'exécution"
glossary:
  - term: "surensemble"
    definition: "A est un surensemble de B si tout ce qui est dans B est aussi dans A. Syntaxiquement, tout fichier JavaScript valide est un fichier TypeScript valide."
  - term: "annotation de type"
    definition: "Le « : string » dans « function greet(who: string) ». Syntaxe propre à TypeScript, effacée à la compilation."
  - term: "soundness"
    definition: "Propriété d'un système de types dont les types statiques ne mentent jamais sur ce qui existe à l'exécution. TypeScript ne la garantit volontairement pas."
visuals: []
labs: [ts-ch00-l01-lab-states]
extra: false
xp: 25
---

## Pourquoi c'est important

On répète que « TypeScript est un surensemble typé de JavaScript ». La phrase est juste, mais elle cache trois idées qui changent la façon de travailler : ce que TypeScript **ajoute** (un vérificateur), ce qu'il **ne change pas** (le programme qui s'exécute) et ce qu'il **ne promet pas** (l'absence d'erreur à l'exécution). Si tu viens de Java, de Go ou de Python, ce modèle mental est la première chose à poser.

## Le concept

### Un surensemble, au sens de la syntaxe

Renomme `main.js` en `main.ts` : tu n'as pas changé de langage, ton code était déjà du TypeScript. C'est ce qui rend la migration d'une base JavaScript progressive (module 13) : on n'écrit pas tout dans un autre langage.

L'inverse est faux. Ce fichier est du TypeScript valide mais pas du JavaScript :

```ts
function greet(who: string) {
  console.log('Bonjour', who);
}
```

Donné à un interpréteur JavaScript pur, il échoue sur `: string` (`SyntaxError`). Dès que tu écris une annotation de type, tu as quitté JavaScript.

### Un vérificateur qui travaille sans exécuter

Même **sans aucune annotation**, TypeScript déduit des types (c'est l'inférence, module 03) et repère des fautes :

```ts
let city = 'new york city';
console.log(city.toUppercase());
// Property 'toUppercase' does not exist on type 'string'. Did you mean 'toUpperCase'?
```

À l'exécution, JavaScript lèverait `TypeError: city.toUppercase is not a function`. Le vérificateur te le dit avant, dans l'éditeur. On parle de typage **statique** : l'analyse porte sur le texte du programme, pas sur son exécution.

Il va même plus loin que les exceptions. Ce code tourne sans erreur et affiche trois fois `undefined` :

```ts
const states = [
  { name: 'Alabama', capital: 'Montgomery' },
  { name: 'Alaska', capital: 'Juneau' },
];
for (const state of states) {
  console.log(state.capitol);   // faute de frappe : « capitol » (le bâtiment) au lieu de « capital »
}
```

TypeScript la signale quand même : `Property 'capitol' does not exist … Did you mean 'capital'?`.

### Les annotations disent ton intention

Que se passe-t-il si la faute est dans les données plutôt que dans le code ?

```ts
const states = [
  { name: 'Alabama', capitol: 'Montgomery' },
  { name: 'Alaska', capitol: 'Juneau' },
];
for (const state of states) {
  console.log(state.capital);   // Did you mean 'capitol' ?
}
```

L'erreur est la même, mais **la suggestion est fausse** : TypeScript ne peut pas deviner quelle orthographe est la bonne. Dis-le-lui :

```ts
interface State {
  name: string;
  capital: string;
}
const states: State[] = [
  { name: 'Alabama', capitol: 'Montgomery' },
  //                 ~~~~~~~ Object literal may only specify known properties… Did you mean 'capital'?
];
```

Maintenant l'erreur est **sur la ligne fautive** et la suggestion est la bonne. Et si une seule entrée sur cent avait contenu la faute ? Sans annotation, TypeScript l'aurait acceptée (il aurait simplement déduit une union de deux formes) ; avec l'annotation, il la trouve. Retiens la règle : **plus tu donnes d'information au vérificateur, plus il trouve de problèmes**.

### Il modélise JavaScript, avec du jugement

Le principe directeur est de refléter le comportement réel de JavaScript. Donc ceci passe, parce que JavaScript le permet :

```ts
const x = 2 + '3';   // string : "23"
const y = '2' + 3;   // string : "23"
```

Mais TypeScript refuse des constructions légales qu'il juge presque toujours fautives :

```ts
const a = null + 7;               // vaut 7 en JS, refusé
const b = [] + 12;                // vaut '12' en JS, refusé
alert('Hello', 'TypeScript');     // l'argument en trop est ignoré en JS, refusé
```

Où placer la limite est une question de goût, que tu délègues à l'équipe de TypeScript en l'adoptant.

### Un programme qui passe peut quand même planter

```ts
const names = ['Alice', 'Bob'];
console.log(names[2].toUpperCase());   // TypeScript : OK. Exécution : TypeError.
```

TypeScript suppose que l'indice est dans le tableau. Son type statique (`string`) et la vraie valeur (`undefined`) ont divergé. Un système de types qui garantit cette cohérence est dit **sound** ; celui de TypeScript **ne l'est pas, par choix** : il vaut mieux rester utilisable avec du JavaScript existant que tout prouver. Le module 07 détaille les trous. D'autres langages (Reason, PureScript, Dart) offrent plus de garanties, mais au prix d'une migration bien plus lourde.

Les trois ensembles de programmes à garder en tête :

- les programmes JavaScript (tous valides en TypeScript) ;
- les programmes TypeScript (JavaScript + annotations) ;
- ceux qui **passent le vérificateur** : le sous-ensemble dans lequel tu vis au quotidien.

## Pièges fréquents

- **Croire que « ça passe » veut dire « ça marche ».** Le vérificateur réduit les erreurs possibles, il ne les élimine pas.
- **Traiter une suggestion de correction comme une vérité.** Elle dépend de ce que TypeScript a déduit ; sans annotation, elle peut viser la mauvaise orthographe.
- **Annoter pour « faire taire » l'erreur** (`: any`, `as`) au lieu de comprendre ce qu'elle dit.

## À retenir

- TypeScript est un surensemble de JavaScript : tout JavaScript valide est du TypeScript valide, pas l'inverse.
- Il ajoute un système de types statique qui modélise le comportement de JavaScript et cherche les erreurs avant l'exécution.
- Il refuse certaines constructions légales mais douteuses (`null + 7`, arguments en trop).
- Un programme qui passe le vérificateur peut lever une exception : le système de types n'est pas sound.
- Les annotations expriment ton intention ; elles améliorent le nombre et la justesse des erreurs trouvées.

> **Au-delà du livre :** dans ce cours, les exécutions se font avec Node.js, qui retire lui-même les annotations (« type stripping ») : `node main.ts` fonctionne sans étape de compilation, et la vérification des types est confiée à `tsc` à part. Tu verras ce découplage en détail à la leçon 3.
