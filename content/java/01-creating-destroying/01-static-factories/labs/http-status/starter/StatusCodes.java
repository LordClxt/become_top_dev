/** Fonctions utilitaires sur les codes HTTP bruts. Ne doit jamais être instanciée. */
public class StatusCodes {

    /** Famille du code : 2 pour 2xx, 4 pour 4xx… */
    public static int family(int code) {
        return code / 100;
    }

    public static boolean isSuccess(int code) {
        return family(code) == 2;
    }
}
