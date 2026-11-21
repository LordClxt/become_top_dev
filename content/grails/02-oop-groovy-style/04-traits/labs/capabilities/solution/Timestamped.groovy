trait Timestamped {
    Date dateCreated
    Date lastUpdated

    String save() {
        if (dateCreated == null) dateCreated = Store.now
        lastUpdated = Store.now
        super.save()
    }
}
