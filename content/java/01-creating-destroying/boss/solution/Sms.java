import java.util.regex.Pattern;

/** Un SMS (160 caractères au plus). */
public final class Sms extends Message {
    public static final int MAX_LENGTH = 160;
    private static final Pattern E164 = Pattern.compile("\\+[0-9]{8,15}");

    private Sms(Builder b) {
        super(b);
        if (body().length() > MAX_LENGTH) {
            throw new IllegalStateException("SMS de " + body().length() + " caractères (max " + MAX_LENGTH + ")");
        }
    }

    public static final class Builder extends Message.Builder<Builder> {
        public Builder(String phone) {
            super(phone);
            if (!E164.matcher(phone).matches()) throw new IllegalArgumentException("numéro non E.164 : " + phone);
        }

        @Override
        public Sms build() { return new Sms(this); }

        @Override
        protected Builder self() { return this; }
    }
}
