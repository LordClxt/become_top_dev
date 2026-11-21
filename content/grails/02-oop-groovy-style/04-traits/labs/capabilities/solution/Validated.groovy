trait Validated {
    abstract boolean isValid()

    String save() {
        valid ? super.save() : 'refusé'      // ne continue pas la chaîne si l'objet est invalide
    }
}
