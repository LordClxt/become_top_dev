/** Un SMS (160 caractères au plus). */
public final class Sms extends Message {

    /** Aujourd'hui : body() et tag() sont recopiés ici ET dans Email.Builder. */
    public static final class Builder {
        public Builder(String phone) {
        }

        public Builder body(String body) {
            throw new UnsupportedOperationException("body à écrire");
        }

        public Builder tag(Tag tag) {
            throw new UnsupportedOperationException("tag à écrire");
        }

        public Sms build() {
            throw new UnsupportedOperationException("build à écrire");
        }
    }
}
