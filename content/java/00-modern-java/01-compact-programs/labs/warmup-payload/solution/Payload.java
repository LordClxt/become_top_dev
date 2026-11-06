/** Le document JSON envoyé à l'application mobile. */
final class Payload {
    private Payload() { throw new AssertionError(); }

    static String notification(String user, int unread) {
        return """
            {
              "user": "%s",
              "unread": %d,
              "links": ["inbox", "settings"]
            }
            """.formatted(user, unread);
    }
}
