class Toolbox {

    /**
     * Appelle `c(tentative)` (tentative vaut 1, 2, 3…) jusqu'à ce qu'un appel réussisse, et renvoie son résultat.
     * Après `times` échecs, relance la DERNIÈRE exception. times < 1 : IllegalArgumentException.
     */
    static Object retry(int times, Closure c) {
        throw new UnsupportedOperationException('à écrire')
    }

    /** Exécute `c` et renvoie [result: <valeur de c>, millis: <durée en ms, entier >= 0>]. */
    static Map timed(Closure c) {
        throw new UnsupportedOperationException('à écrire')
    }

    /**
     * Renvoie une closure qui exécute `c` AU PLUS UNE FOIS : le premier appel calcule (avec ses arguments)
     * et mémorise le résultat, les appels suivants renvoient ce résultat sans rien exécuter.
     * Si le premier appel lève une exception, rien n'est mémorisé et le prochain appel réessaie.
     */
    static Closure once(Closure c) {
        throw new UnsupportedOperationException('à écrire')
    }

    /**
     * Compte les éléments de `items` selon la clé que renvoie `key(item)`.
     * Les clés gardent l'ordre de première apparition.
     */
    static Map groupCount(Iterable items, Closure key) {
        throw new UnsupportedOperationException('à écrire')
    }
}
