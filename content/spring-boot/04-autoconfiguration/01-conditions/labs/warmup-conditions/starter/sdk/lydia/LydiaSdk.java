package sdk.lydia;

/** Le SDK (fictif) du prestataire Lydia : présent seulement si la dépendance est ajoutée. Fourni. */
public class LydiaSdk {
    public String pay(int cents) { return "lydia-" + cents; }
}
