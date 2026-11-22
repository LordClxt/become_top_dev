package app;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

/** Exporte un billet vers le partenaire. Écrit pour Spring Boot 3. */
@Service
public class TicketExporter {
    private final ObjectMapper mapper;

    public TicketExporter(ObjectMapper mapper) { this.mapper = mapper; }

    public String export(Ticket ticket) {
        try {
            return mapper.writeValueAsString(ticket);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("export impossible", e);
        }
    }
}
