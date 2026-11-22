package sdk.sms;

/** SDK (fictif) d'envoi de SMS : optionnel. Fourni. */
public class SmsSdk {
    private final String sender;
    public SmsSdk(String sender) { this.sender = sender; }
    public String send(String to, String text) { return "sms(" + sender + "):" + to + ":" + text; }
}
