/** Un contrôle avant acceptation. La bibliothèque livre StandardCheck ; chaque desk peut écrire son propre enum. Fourni. */
public interface OrderCheck {
    /** Vrai si l'ordre passe ce contrôle. */
    boolean passes(Order order);
}
