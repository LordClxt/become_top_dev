package app;

/** Un secret obligatoire n'est pas configuré. Fourni : ne pas modifier. */
public class MissingSecretException extends RuntimeException {
    private final String property;
    private final String envVariable;

    public MissingSecretException(String property, String envVariable) {
        super("secret manquant : " + property);
        this.property = property;
        this.envVariable = envVariable;
    }

    public String property() { return property; }

    public String envVariable() { return envVariable; }
}
