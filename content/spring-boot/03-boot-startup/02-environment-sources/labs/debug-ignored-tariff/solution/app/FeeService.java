package app;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Les frais de service facturés par place. */
@Service
public class FeeService {
    private final int feeCents;
    private final String currency;

    public FeeService(@Value("${tixa.fee-cents}") int feeCents, @Value("${tixa.fee-currency}") String currency) {
        this.feeCents = feeCents;
        this.currency = currency;
    }

    public String describe() { return feeCents + " " + currency; }
}
