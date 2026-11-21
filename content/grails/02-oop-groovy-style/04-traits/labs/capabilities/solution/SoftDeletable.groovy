trait SoftDeletable {
    boolean deleted
    Date deletedAt

    void softDelete() {
        deleted = true
        deletedAt = Store.now
    }

    boolean isActive() { !deleted }
}
