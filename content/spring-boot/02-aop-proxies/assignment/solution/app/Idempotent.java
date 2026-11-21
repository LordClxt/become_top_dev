package app;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Un deuxième appel avec la même clé d'idempotence renvoie le résultat du premier, sans réexécuter la méthode.
 * keyArg : position de l'argument qui porte la clé (une String). Fourni.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Idempotent {
    int keyArg() default 0;
}
