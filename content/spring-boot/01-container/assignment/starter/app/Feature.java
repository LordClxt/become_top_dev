package app;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Rattache un bean à une fonctionnalité qu'on peut couper par configuration :
 * tixa.features.<value>=false. Se pose sur une classe @Component ou sur une méthode @Bean. Fourni.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface Feature {
    String value();
}
