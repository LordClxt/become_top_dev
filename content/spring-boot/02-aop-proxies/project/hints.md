## Hint 1
M1 : `@EnableAspectJAutoProxy`, un `@Around("@annotation(app.Audited)")`, et l'aspect déclaré en `@Bean`. M2 : `@Retryable` n'est actif qu'avec `@EnableResilientMethods` sur une configuration ; `includes` dit quelles exceptions déclenchent un nouvel essai, `maxRetries` compte les essais **en plus** du premier.

## Hint 2
Spring 7 ajoute le conseil de `@Retryable` **en tête** de la chaîne du proxy (`setBeforeExistingAdvisors(true)` dans `RetryAnnotationBeanPostProcessor`) : il enveloppe tous les autres aspects du même bean, quel que soit leur `@Order`. Un audit sur `charge` voit donc chaque tentative.

## Hint 3
Pour voir le paiement une seule fois, l'audit doit être **à l'extérieur** du retry, donc sur un autre bean : celui qui appelle `charge`. `@Audited` sur `Checkout.pay`, et le premier argument devient la référence de la commande.
