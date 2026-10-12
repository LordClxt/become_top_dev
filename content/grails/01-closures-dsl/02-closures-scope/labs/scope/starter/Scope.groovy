class Scope {

    /**
     * Renvoie une closure qui additionne son argument à un total, et renvoie ce total.
     * Le total démarre à `start` et appartient à CETTE closure : deux accumulateurs sont indépendants.
     *   def acc = Scope.accumulator(10); acc(5) == 15; acc(1) == 16
     */
    static Closure accumulator(Number start) {
        throw new UnsupportedOperationException('à écrire')
    }

    /**
     * Renvoie une map [inc: closure, value: closure] dont les DEUX closures partagent le même compteur.
     *   inc() augmente le compteur de 1 et renvoie sa nouvelle valeur ; value() le renvoie sans le changer.
     * Chaque appel de counters() crée un compteur neuf.
     */
    static Map counters() {
        throw new UnsupportedOperationException('à écrire')
    }

    /**
     * Exécute `c` avec `target` pour delegate, en donnant la priorité au delegate
     * (resolveStrategy DELEGATE_FIRST), et renvoie le résultat de la closure.
     *   Scope.runWith([a: 1, b: 2]) { a + b }  ==  3
     */
    static Object runWith(Object target, Closure c) {
        throw new UnsupportedOperationException('à écrire')
    }
}
