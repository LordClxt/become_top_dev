import java.util.Set;

/**
 * Un message à envoyer. Abstraite : voir Email et Sms.
 * TODO : un builder commun Message.Builder porte body() et tag() ; Email.Builder et Sms.Builder
 * l'étendent et ne redéclarent plus ces méthodes.
 */
public abstract class Message {

    public String recipient() {
        throw new UnsupportedOperationException("recipient à écrire");
    }

    public String body() {
        throw new UnsupportedOperationException("body à écrire");
    }

    public Set<Tag> tags() {
        throw new UnsupportedOperationException("tags à écrire");
    }
}
