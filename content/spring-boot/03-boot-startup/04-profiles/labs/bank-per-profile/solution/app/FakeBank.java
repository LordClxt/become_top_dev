package app;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** Une banque simulée, qui accepte tout : pour le développement et les tests. */
@Component
@Profile("!prod")   // partout, sauf quand prod est actif (directement ou par un groupe)
public class FakeBank implements BankClient {
    public String describe() { return "factice"; }
}
