package app;

import org.springframework.stereotype.Component;

/** Une banque simulée, qui accepte tout : pour le développement et les tests. */
@Component
public class FakeBank implements BankClient {
    public String describe() { return "factice"; }
}
