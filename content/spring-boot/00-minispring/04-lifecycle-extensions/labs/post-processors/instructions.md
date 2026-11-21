## Contexte

Le conteneur sait créer des objets ; il doit maintenant les **initialiser**, laisser des extensions les **remplacer** (c'est ainsi que Spring pose ses proxies), et les **détruire** proprement à l'arrêt.

`MiniContainer` est fourni : il crée d'abord les beans qui implémentent `BeanPostProcessor`, puis les autres, et appelle `Lifecycle` pour tout le reste. Tu écris `Lifecycle.java`.

## 1. `initialize(name, bean, processors)`

Dans cet ordre :
1. `before(name, …)` de chaque processeur, dans l'ordre de la liste ; chacun reçoit le résultat du précédent ;
2. les méthodes `@PostConstruct` du bean, même `private` ;
3. `after(name, …)` de chaque processeur, de la même façon.

Renvoie le résultat final : c'est lui qui devient le bean (par exemple un proxy).

## 2. `destroyAll(createdInOrder)`

Appelle les méthodes `@PreDestroy` **du dernier objet créé au premier**. Si l'une lève une exception, continue avec les suivantes, puis lève une `BeanException` dont le message contient la cause (les erreurs suivantes en exceptions *supprimées*).

## Attention

Les méthodes `@PostConstruct` se cherchent sur l'objet **d'origine** : un proxy renvoyé par un processeur ne les a pas.
