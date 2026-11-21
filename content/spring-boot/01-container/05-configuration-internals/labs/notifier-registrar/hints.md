## Hint 1
`register(registry, env)` est appelé pendant que le conteneur lit les classes `@Configuration`, **avant** de créer le moindre bean. Tu lis la propriété dans `env`, puis tu décris chaque bean à `registry`. La création réelle viendra plus tard : il faut donc donner une recette, pas un objet.

## Hint 2
`registry.registerBean(name, Notifier.class, spec -> ...)` : dans `spec`, `supplier(ctx -> ...)` donne la recette, et `primary()` marque le bean par défaut. Le `ctx` du supplier sait fournir d'autres beans : `ctx.bean(SmsQuota.class)`.

## Hint 3
`env.getProperty("tixa.notifiers", "")`, `split(",")`, `trim()`, filtre les chaînes vides. Une `TreeMap<String, Function<BeanRegistry.SupplierContext, Notifier>>` des canaux connus donne à la fois la recette et la liste triée pour le message d'erreur. `primary()` seulement pour l'index 0.
