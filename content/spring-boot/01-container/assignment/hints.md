## Hint 1
Il faut agir **avant** la phase qui crée les singletons : c'est le rôle d'un `BeanFactoryPostProcessor`. Sa variante `BeanDefinitionRegistryPostProcessor` reçoit le registre des définitions et peut en **retirer**.

## Hint 2
Une définition issue du scan ou d'une méthode `@Bean` est une `AnnotatedBeanDefinition` : `getMetadata()` décrit la classe, `getFactoryMethodMetadata()` décrit la méthode `@Bean` (ou `null`). Les deux savent lire une annotation **sans charger la classe**. Pour la propriété : `environment.getProperty(clé, Boolean.class, true)`, avec l'`Environment` reçu par `EnvironmentAware`.

## Hint 3
Une méthode `@Bean` qui renvoie un post-processor de fabrique doit être `static` : sinon, Spring doit instancier `ShopConfig` en avance pour l'appeler (il l'écrit dans ses logs au niveau INFO, que le bac à sable n'affiche pas).
