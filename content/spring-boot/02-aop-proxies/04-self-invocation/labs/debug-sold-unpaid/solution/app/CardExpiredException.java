package app;

/** Ajoutée la semaine dernière : la carte a expiré. Exception vérifiée. */
public class CardExpiredException extends Exception {
    public CardExpiredException(String message) { super(message); }
}
