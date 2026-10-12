class Callbacks {

    /**
     * Comme Map.each : si la closure déclare UN paramètre, elle reçoit l'entrée (Map.Entry) ;
     * si elle en déclare DEUX ou plus, elle reçoit (clé, valeur).
     * Renvoie la liste des résultats de la closure, dans l'ordre de la map.
     */
    static List collectAdaptive(Map map, Closure c) {
        throw new UnsupportedOperationException('à écrire')
    }

    /**
     * Protocole de ressource : ajoute 'open' dans `log`, appelle la closure en lui passant `log`,
     * puis ajoute 'close' quoi qu'il arrive (même si la closure lève une exception, qui est alors relancée).
     * Renvoie le résultat de la closure.
     */
    static Object withResource(List log, Closure c) {
        throw new UnsupportedOperationException('à écrire')
    }

    /**
     * Renvoie le premier élément strictement supérieur à `limit`, ou null.
     * Doit s'ARRÊTER dès qu'il l'a trouvé : on ne parcourt pas le reste de `items`.
     */
    static Object firstOver(Iterable items, Number limit) {
        throw new UnsupportedOperationException('à écrire')
    }
}
