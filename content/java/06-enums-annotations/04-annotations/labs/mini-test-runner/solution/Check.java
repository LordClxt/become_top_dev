import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Marque une vérification : une méthode static sans paramètre, réussie si elle ne lève rien. */
@Retention(RetentionPolicy.RUNTIME)   // sans elle (CLASS par défaut), la réflexion ne voit rien
@Target(ElementType.METHOD)
public @interface Check { }
