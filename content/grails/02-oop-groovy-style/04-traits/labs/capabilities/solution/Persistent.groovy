// Fourni : ne pas modifier. Le bas de la chaîne : attribue un id et range l'objet.
trait Persistent {
    Long id

    String save() {
        if (id == null) id = Store.nextId()
        if (!Store.saved.contains(this)) Store.saved << this
        "saved#$id"
    }
}
