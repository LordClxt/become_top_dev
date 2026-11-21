package app;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** La vraie banque : exige son URL et sa région. */
@Component
public class LiveBank implements BankClient {
    private final String url;
    private final String region;

    public LiveBank(@Value("${tixa.bank.url}") String url, @Value("${tixa.bank.region}") String region) {
        this.url = url;
        this.region = region;
    }

    public String describe() { return "live " + region + " " + url; }
}
