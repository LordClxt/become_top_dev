/** Erreur de lecture JSON, avec la position du problème dans le texte. NE PAS MODIFIER. */
final class JsonException extends RuntimeException {
    private final int position;

    JsonException(String message, int position) {
        super(message + " (position " + position + ")");
        this.position = position;
    }

    int position() { return position; }
}
