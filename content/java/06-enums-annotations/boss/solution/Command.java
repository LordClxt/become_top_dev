import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Fait d'une méthode une commande de console. roles vide : tous les rôles. */
@Retention(RetentionPolicy.RUNTIME)   // sans elle, la réflexion ne voit rien
@Target(ElementType.METHOD)           // sur une méthode, et nulle part ailleurs
public @interface Command {
    String value();

    Role[] roles() default {};
}
