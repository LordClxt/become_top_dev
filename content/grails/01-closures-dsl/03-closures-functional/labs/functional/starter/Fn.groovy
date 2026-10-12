class Fn {

    /**
     * Pipeline : compose(f, g, h) renvoie une closure x -> h(g(f(x))), c'est-à-dire f d'abord.
     * Avec zéro closure, renvoie l'identité.
     */
    static Closure compose(Closure... fs) {
        throw new UnsupportedOperationException('à écrire')
    }

    /** Renvoie `c` avec ses premiers paramètres déjà fixés à `fixed` (application partielle à gauche). */
    static Closure partial(Closure c, Object... fixed) {
        throw new UnsupportedOperationException('à écrire')
    }

    /** Renvoie `c` avec son DERNIER paramètre fixé à `last`. */
    static Closure withLast(Closure c, Object last) {
        throw new UnsupportedOperationException('à écrire')
    }

    /** Renvoie une version de `f` qui ne recalcule jamais deux fois le même argument. */
    static Closure cached(Closure f) {
        throw new UnsupportedOperationException('à écrire')
    }

    /**
     * Somme 1 + 2 + … + n pour un très grand n (jusqu'à 200 000) avec une closure récursive.
     * Doit ne pas déborder la pile.
     */
    static long sumTo(long n) {
        throw new UnsupportedOperationException('à écrire')
    }
}
