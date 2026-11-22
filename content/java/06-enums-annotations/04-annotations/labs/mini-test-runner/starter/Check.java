import java.lang.annotation.ElementType;
import java.lang.annotation.Target;

/** Marque une vérification : une méthode static sans paramètre, réussie si elle ne lève rien. */
@Target(ElementType.METHOD)
public @interface Check { }
