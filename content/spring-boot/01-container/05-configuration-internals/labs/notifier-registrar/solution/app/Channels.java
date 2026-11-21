package app;

/** Les canaux disponibles. Fourni : ne pas modifier. */
final class Channels {
    private Channels() { }

    static final class Email implements Notifier {
        public String send(String to, String message) { return "email:" + to + ":" + message; }
    }

    static final class Push implements Notifier {
        public String send(String to, String message) { return "push:" + to + ":" + message; }
    }

    static final class Sms implements Notifier {
        private final SmsQuota quota;

        Sms(SmsQuota quota) { this.quota = quota; }

        public String send(String to, String message) {
            quota.consume();
            return "sms:" + to + ":" + message;
        }
    }
}
