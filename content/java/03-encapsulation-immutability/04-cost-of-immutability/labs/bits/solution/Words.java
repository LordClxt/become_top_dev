/** Copie de tableaux, avec un compteur. Fourni : ne pas modifier, et faire passer toutes les copies par ici. */
public final class Words {
    private static long copies;

    private Words() { }

    public static long[] copy(long[] words) {
        copies++;
        return words.clone();
    }

    public static long copies() { return copies; }

    public static void reset() { copies = 0; }
}
