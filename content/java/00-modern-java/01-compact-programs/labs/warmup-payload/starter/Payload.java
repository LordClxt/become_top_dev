/** Le document JSON envoyé à l'application mobile. */
final class Payload {
    private Payload() { throw new AssertionError(); }

    static String notification(String user, int unread) {
        // TODO : réécris avec un bloc de texte et formatted(...)
        return "{\n" +
               "  \"user\": \"" + user + "\",\n" +
               "   \"unread\": " + unread + ",\n" +
               "  \"links\": [\"inbox\", \"settings\"]\n" +
               "}";
    }
}
