package app;

import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class CustomerDirectory {
    private final Map<String, Customer> customers = Map.of("c-1", new Customer("c-1", "Ana"), "c-2", new Customer("c-2", "Ben"));

    public Optional<Customer> find(String id) {
        return id == null ? Optional.empty() : Optional.ofNullable(customers.get(id));
    }
}
