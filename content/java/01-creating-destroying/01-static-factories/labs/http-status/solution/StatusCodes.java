/** Fonctions utilitaires sur les codes HTTP bruts. Classe non instanciable. */
public final class StatusCodes {
    // Supprime le constructeur par défaut : personne ne doit instancier cette classe.
    private StatusCodes() {
        throw new AssertionError("classe utilitaire : pas d'instance");
    }

    /** Famille du code : 2 pour 2xx, 4 pour 4xx… */
    public static int family(int code) {
        return code / 100;
    }

    public static boolean isSuccess(int code) {
        return family(code) == 2;
    }
}
