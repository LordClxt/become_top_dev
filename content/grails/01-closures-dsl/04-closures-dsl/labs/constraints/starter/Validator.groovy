class Validator {

    /**
     * Construit un validateur à partir d'un DSL :
     *
     *   def v = Validator.build {
     *       name blank: false, size: 2..10
     *       age  range: 0..150, nullable: true
     *       role inList: ['admin', 'user']
     *   }
     *
     * Chaque ligne est un appel `champ(Map contraintes)` reçu par un builder (le delegate de la closure).
     * Contraintes connues : nullable, blank, size, range, inList, matches.
     * Une contrainte inconnue lève IllegalArgumentException("contrainte inconnue : <nom>") dès le build.
     */
    static Validator build(Closure spec) {
        throw new UnsupportedOperationException('à écrire')
    }

    /**
     * Valide une map de données et renvoie la liste des codes d'erreur "champ.contrainte".
     *
     *  - Les champs sont parcourus dans l'ordre de déclaration ; pour un champ, dans l'ordre
     *    nullable, blank, size, range, inList, matches. Une même contrainte donne au plus une erreur.
     *  - Par défaut un champ NE PEUT PAS être null (comme dans GORM) : erreur "champ.nullable",
     *    et on ne teste rien d'autre sur ce champ. Avec nullable: true, un null est accepté sans autre test.
     *  - blank: false refuse une chaîne vide ou faite d'espaces ("champ.blank").
     *  - size: intervalle sur value.size() ; range: intervalle sur la valeur ; inList: liste de valeurs permises ;
     *    matches: expression régulière (String) que la valeur doit satisfaire en entier.
     *  - Les clés de `data` qui n'ont pas de règle sont ignorées.
     */
    List<String> validate(Map data) {
        throw new UnsupportedOperationException('à écrire')
    }
}
