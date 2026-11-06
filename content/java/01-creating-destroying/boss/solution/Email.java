import java.util.Objects;

/** Un e-mail. */
public final class Email extends Message {
    private final String subject;

    private Email(Builder b) {
        super(b);
        this.subject = b.subject;
    }

    public String subject() { return subject; }

    public static final class Builder extends Message.Builder<Builder> {
        private String subject = "(sans objet)";

        public Builder(String to) {
            super(to);
            int at = to.indexOf('@');
            if (at <= 0 || at == to.length() - 1) throw new IllegalArgumentException("adresse invalide : " + to);
        }

        public Builder subject(String subject) {
            this.subject = Objects.requireNonNull(subject, "subject");
            return this;
        }

        @Override
        public Email build() { return new Email(this); }

        @Override
        protected Builder self() { return this; }
    }
}
