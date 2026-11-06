/** Un e-mail. */
public final class Email extends Message {

    public String subject() {
        throw new UnsupportedOperationException("subject à écrire");
    }

    /** Aujourd'hui : body() et tag() sont recopiés ici ET dans Sms.Builder. */
    public static final class Builder {
        public Builder(String to) {
        }

        public Builder subject(String subject) {
            throw new UnsupportedOperationException("subject à écrire");
        }

        public Builder body(String body) {
            throw new UnsupportedOperationException("body à écrire");
        }

        public Builder tag(Tag tag) {
            throw new UnsupportedOperationException("tag à écrire");
        }

        public Email build() {
            throw new UnsupportedOperationException("build à écrire");
        }
    }
}
