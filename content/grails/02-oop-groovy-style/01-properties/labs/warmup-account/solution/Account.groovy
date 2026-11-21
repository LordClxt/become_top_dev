class Account {
    String name
    String email
    final String id = 'acc-' + UUID.randomUUID().toString().take(8)
    boolean locked

    void setEmail(String e) {
        email = e?.trim()?.toLowerCase()   // dans la classe : le champ, pas le setter
    }

    String getDisplayName() {
        email ? "$name <$email>" : name
    }
}
