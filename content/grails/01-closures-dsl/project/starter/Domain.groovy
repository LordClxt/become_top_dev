/**
 * Le « GORM » de Minigrails : valide un objet à partir du `static constraints = { … }` de sa classe.
 *
 *   class Person {
 *       String name
 *       Integer age
 *       static constraints = {
 *           name blank: false, size: 2..10
 *           age  range: 0..150, nullable: true
 *       }
 *   }
 *   Domain.validate(new Person(name: 'A'))   // ['name.size']
 */
class Domain {

    /**
     * JALON 1. Valide `instance` avec le bloc `static constraints` de sa classe et renvoie les codes d'erreur.
     * - une classe sans `constraints` n'a aucune règle : liste vide ;
     * - la closure `constraints` est partagée par toutes les instances : ne la modifie pas
     *   (travaille sur une copie, par exemple avec rehydrate) ;
     * - les valeurs à valider sont les propriétés de l'instance.
     */
    static List<String> validate(Object instance) {
        throw new UnsupportedOperationException('jalon 1')
    }

    /**
     * JALON 3. Valide plusieurs objets. Renvoie une map index -> erreurs, SEULEMENT pour les objets invalides.
     * Un objet valide n'apparaît pas.
     */
    static Map<Integer, List<String>> validateAll(Collection instances) {
        throw new UnsupportedOperationException('jalon 3')
    }

    /** JALON 3. Renvoie la liste des objets valides, dans l'ordre d'origine. */
    static List valid(Collection instances) {
        throw new UnsupportedOperationException('jalon 3')
    }
}
