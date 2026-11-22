package tixa.notify;

import java.util.List;

/** Envoie une notification sur tous les canaux disponibles. Fourni : ne pas modifier. */
public class NotificationService {
    private final List<Notifier> notifiers;

    public NotificationService(List<Notifier> notifiers) { this.notifiers = List.copyOf(notifiers); }

    public List<String> broadcast(String to, String text) {
        return notifiers.stream().map(n -> n.notify(to, text)).toList();
    }
}
