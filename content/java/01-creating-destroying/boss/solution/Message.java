import java.util.Collections;
import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;

/** Un message à envoyer. Abstraite : voir {@link Email} et {@link Sms}. */
public abstract class Message {
    private final String recipient;
    private final String body;
    private final Set<Tag> tags;

    Message(Builder<?> b) {
        if (b.body == null || b.body.isBlank()) throw new IllegalStateException("body obligatoire");
        this.recipient = b.recipient;
        this.body = b.body;
        this.tags = Collections.unmodifiableSet(EnumSet.copyOf(b.tags)); // copie : indépendante du builder
    }

    public String recipient() { return recipient; }

    public String body() { return body; }

    public Set<Tag> tags() { return tags; }

    /** Builder commun ; T est le type du builder concret, pour chaîner sans cast. */
    public abstract static class Builder<T extends Builder<T>> {
        private final String recipient;
        private final EnumSet<Tag> tags = EnumSet.noneOf(Tag.class);
        private String body;

        Builder(String recipient) {
            this.recipient = Objects.requireNonNull(recipient, "recipient");
        }

        public T body(String body) {
            this.body = Objects.requireNonNull(body, "body");
            return self();
        }

        public T tag(Tag tag) {
            tags.add(Objects.requireNonNull(tag, "tag"));
            return self();
        }

        public abstract Message build();

        protected abstract T self();
    }
}
