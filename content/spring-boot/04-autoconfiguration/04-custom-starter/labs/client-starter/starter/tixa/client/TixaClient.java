package tixa.client;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/** Le client, construit par un builder. Fourni : ne pas modifier. */
public final class TixaClient {
    private final String baseUrl;
    private final Duration timeout;
    private final List<String> headers;

    private TixaClient(Builder b) {
        this.baseUrl = b.baseUrl;
        this.timeout = b.timeout;
        this.headers = List.copyOf(b.headers);
    }

    public String baseUrl() { return baseUrl; }
    public Duration timeout() { return timeout; }
    public List<String> headers() { return headers; }

    public static Builder builder() { return new Builder(); }

    public static final class Builder {
        private String baseUrl;
        private Duration timeout;
        private final List<String> headers = new ArrayList<>();

        public Builder baseUrl(String url) { this.baseUrl = url; return this; }
        public Builder timeout(Duration t) { this.timeout = t; return this; }
        public Builder header(String h) { headers.add(h); return this; }
        public TixaClient build() { return new TixaClient(this); }
    }
}
