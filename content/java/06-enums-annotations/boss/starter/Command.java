/** Fait d'une méthode une commande de console. roles vide : tous les rôles. */
public @interface Command {
    String value();

    Role[] roles() default {};
}
