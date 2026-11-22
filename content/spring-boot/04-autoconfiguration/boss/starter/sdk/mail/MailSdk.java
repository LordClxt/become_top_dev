package sdk.mail;

/** SDK (fictif) d'envoi d'e-mails : optionnel. Fourni. */
public class MailSdk {
    public String send(String to, String text) { return "mail:" + to + ":" + text; }
}
