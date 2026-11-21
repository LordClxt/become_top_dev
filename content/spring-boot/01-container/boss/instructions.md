## Contexte

Le bug des paniers partagés (leçon 3) est revenu deux fois en production : à chaque fois, un singleton recevait un prototype par son constructeur, donc **une seule fois**. L'équipe veut qu'il devienne **impossible** : l'application doit refuser de démarrer.

Tu écris `ScopeGuard`, un `BeanFactoryPostProcessor`. Les tests le déclarent comme une classe de configuration (`new AnnotationConfigApplicationContext(ScopeGuard.class, …)`).

Pas d'indices pour ce combat : tout ce qu'il faut est dans les cinq leçons du module.

## La règle

Pour chaque bean **singleton**, regarde ses points d'injection :
- les paramètres de sa méthode `@Bean` ;
- sinon, les paramètres du constructeur que Spring utilisera pour sa classe (le seul constructeur, ou celui annoté `@Autowired`).

Il y a **violation** quand le type d'un paramètre peut recevoir un bean **prototype** (même type, super-classe ou interface). Un paramètre `ObjectProvider<…>` ou `ObjectFactory<…>` n'est **pas** une violation : il redemande le bean à chaque fois. Un prototype qui reçoit un prototype non plus.

## Le message

S'il y a au moins une violation, le démarrage échoue avec une `IllegalStateException` qui les liste **toutes**, triées, une par ligne :

```
portée incohérente — un singleton reçoit un prototype une seule fois :
  holdDesk ← seatHold (SeatHold)
  scopeGuardTest.ReportService ← scopeGuardTest.ExportJob (ExportJob)
```

Format d'une ligne : `nomDuSingleton ← nomDuPrototype (NomSimpleDuTypeDuPrototype)`, deux espaces au début.

## L'exigence qui fait la différence

**Aucun bean ne doit être instancié** pendant la vérification : les tests utilisent des classes dont le constructeur lève une erreur. Tu peux charger des classes, tu ne dois rien créer.
