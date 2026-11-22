package app;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ReservationStore {
    private final List<Reservation> all = List.of(
            new Reservation(1, "c-1", "Nuits de Fourvière", 2),
            new Reservation(2, "c-2", "Jazz à Vienne", 4),
            new Reservation(3, "c-1", "Les Eurockéennes", 1));

    public List<Reservation> of(String customerId) {
        return all.stream().filter(r -> r.customerId().equals(customerId)).toList();
    }
}
