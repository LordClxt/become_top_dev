package app;

import org.springframework.stereotype.Service;

import tools.jackson.databind.json.JsonMapper;

/** Exporte un billet vers le partenaire. */
@Service
public class TicketExporter {
    private final JsonMapper mapper;

    // Le JsonMapper du conteneur : celui de Spring Boot, avec les customizers de l'application.
    public TicketExporter(JsonMapper mapper) { this.mapper = mapper; }

    // Jackson 3 : JacksonException est une RuntimeException, plus de try/catch obligatoire.
    public String export(Ticket ticket) {
        return mapper.writeValueAsString(ticket);
    }
}
