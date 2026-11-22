package tixa.client;

/** Encode un billet avant envoi. */
public interface TicketCodec {
    String encode(String eventId, int seats);
}
