/** Ce qu'un utilisateur peut faire, avec son code d'une lettre. APPROVE a été ajoutée récemment. Fourni. */
public enum Permission {
    VIEW('V'), TRADE('T'), APPROVE('A'), CANCEL('C'), ADMIN('X');

    private final char code;

    Permission(char code) { this.code = code; }

    public char code() { return code; }
}
